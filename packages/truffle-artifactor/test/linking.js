// Override artifactor
var assert = require("chai").assert;
var Artifactor = require("../");
var temp = require("temp").track();
var path = require("path");
var requireNoCache = require("require-nocache")(module);
var contract = require("truffle-contract");
var Web3 = require("web3");
var TestRPC = require("ethereumjs-testrpc");
var fs = require("fs");
var solc = require("solc");
// Clean up after solidity. Only remove solidity's listener,
// which happens to be the first.
process.removeListener("uncaughtException", process.listeners("uncaughtException")[0]);

describe("Library linking", function() {
  var LibraryExample;
  var provider = TestRPC.provider();
  var network_id;
  var web3 = new Web3();
  web3.setProvider(provider)

  before(function(done) {
    web3.version.getNetwork(function(err, id) {
      if (err) return done(err);
      network_id = id;
      done();
    });
  });

  before(function(done) {
    var dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-test-libraries-'
    });

    var artifactor = new Artifactor(dirPath);

    // Deliberately only use the file path (and no binary path)
    // to test that case.
    var expected_filepath = path.join(dirPath, "LibraryExample.json");

    // ABI doesn't actually matter here.
    artifactor.save({
      contract_name: "LibraryExample",
      abi: [],
      binary: "606060405260ea8060106000396000f3606060405260e060020a600035046335b09a6e8114601a575b005b601860e160020a631ad84d3702606090815273__A_____________________________________906335b09a6e906064906020906004818660325a03f415600257506040805160e160020a631ad84d37028152905173__B_____________________________________9350600482810192602092919082900301818660325a03f415600257506040805160e160020a631ad84d37028152905173821735ac2129bdfb20b560de2718783caf61ad1c9350600482810192602092919082900301818660325a03f41560025750505056",
      network_id: network_id
    }).then(function() {
      var json = requireNoCache(expected_filepath);
      LibraryExample = contract(json);

      LibraryExample.setNetwork(network_id);
    }).then(done).catch(done);
  });

  after(function(done) {
    temp.cleanupSync();
    done();
  });

  it("leaves binary unlinked initially", function() {
    assert(LibraryExample.binary.indexOf("__A_____________________________________") >= 0);
  });

  it("links first library properly", function() {
    LibraryExample.link("A", "0x1234567890123456789012345678901234567890");

    assert(LibraryExample.binary.indexOf("__A_____________________________________"), -1);
    assert(LibraryExample.binary == "0x606060405260ea8060106000396000f3606060405260e060020a600035046335b09a6e8114601a575b005b601860e160020a631ad84d37026060908152731234567890123456789012345678901234567890906335b09a6e906064906020906004818660325a03f415600257506040805160e160020a631ad84d37028152905173__B_____________________________________9350600482810192602092919082900301818660325a03f415600257506040805160e160020a631ad84d37028152905173821735ac2129bdfb20b560de2718783caf61ad1c9350600482810192602092919082900301818660325a03f41560025750505056")
  });

  it("links second library properly", function() {
    LibraryExample.link("B", "0x1111111111111111111111111111111111111111");

    assert(LibraryExample.binary.indexOf("__B_____________________________________"), -1);
    assert(LibraryExample.binary == "0x606060405260ea8060106000396000f3606060405260e060020a600035046335b09a6e8114601a575b005b601860e160020a631ad84d37026060908152731234567890123456789012345678901234567890906335b09a6e906064906020906004818660325a03f415600257506040805160e160020a631ad84d3702815290517311111111111111111111111111111111111111119350600482810192602092919082900301818660325a03f415600257506040805160e160020a631ad84d37028152905173821735ac2129bdfb20b560de2718783caf61ad1c9350600482810192602092919082900301818660325a03f41560025750505056")
  });

  it("allows for selective relinking", function() {
    assert(LibraryExample.binary.indexOf("__A_____________________________________"), -1);
    assert(LibraryExample.binary.indexOf("__B_____________________________________"), -1);

    LibraryExample.link("A", "0x2222222222222222222222222222222222222222");

    assert(LibraryExample.binary == "0x606060405260ea8060106000396000f3606060405260e060020a600035046335b09a6e8114601a575b005b601860e160020a631ad84d37026060908152732222222222222222222222222222222222222222906335b09a6e906064906020906004818660325a03f415600257506040805160e160020a631ad84d3702815290517311111111111111111111111111111111111111119350600482810192602092919082900301818660325a03f415600257506040805160e160020a631ad84d37028152905173821735ac2129bdfb20b560de2718783caf61ad1c9350600482810192602092919082900301818660325a03f41560025750505056")
  });
});

describe("Library linking with contract objects", function() {
  var ExampleLibrary;
  var ExampleLibraryConsumer;
  var exampleConsumer;
  var accounts;
  var web3;
  var provider = TestRPC.provider();
  var web3 = new Web3();
  web3.setProvider(provider)

  before(function(done) {
    web3.version.getNetwork(function(err, id) {
      if (err) return done(err);
      network_id = id;
      done();
    });
  });

  before(function(done) {
    this.timeout(10000);

    var sources = {
      "ExampleLibrary.sol": fs.readFileSync("./test/ExampleLibrary.sol", {encoding: "utf8"}),
      "ExampleLibraryConsumer.sol": fs.readFileSync("./test/ExampleLibraryConsumer.sol", {encoding: "utf8"})
    };

    // Compile first
    var result = solc.compile({sources: sources}, 1);

    var dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-test-contract-linking-'
    });

    var artifactor = new Artifactor(dirPath);

    artifactor.saveAll({
      ExampleLibrary: {
        binary: result.contracts["ExampleLibrary"].bytecode,
        abi: JSON.parse(result.contracts["ExampleLibrary"].interface),
        network_id: network_id
      },
      ExampleLibraryConsumer: {
        binary: result.contracts["ExampleLibraryConsumer"].bytecode,
        abi: JSON.parse(result.contracts["ExampleLibraryConsumer"].interface),
        network_id: network_id
      }
    }, dirPath).then(function() {

      var json = requireNoCache(path.join(dirPath, "ExampleLibrary.json"));
      ExampleLibrary = contract(json);
      ExampleLibrary.setProvider(provider);

      json = requireNoCache(path.join(dirPath, "ExampleLibraryConsumer.json"));
      ExampleLibraryConsumer = contract(json);
      ExampleLibraryConsumer.setProvider(provider);
    }).then(done).catch(done);
  });

  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      accounts = accs;

      ExampleLibrary.defaults({
        from: accounts[0]
      });

      ExampleLibraryConsumer.defaults({
        from: accounts[0]
      });

      ExampleLibrary.setNetwork(network_id);
      ExampleLibraryConsumer.setNetwork(network_id);

      done(err);
    });
  });

  before("deploy library", function(done) {
    ExampleLibrary.new({gas: 3141592}).then(function(instance) {
      ExampleLibrary.address = instance.address;
    }).then(done).catch(done);
  });

  after(function(done) {
    temp.cleanupSync();
    done();
  });

  it("should consume library's events when linked", function(done) {
    ExampleLibraryConsumer.link(ExampleLibrary);

    assert.equal(Object.keys(ExampleLibraryConsumer.events || {}).length, 1);

    ExampleLibraryConsumer.new({gas: 3141592}).then(function(consumer) {
      return consumer.triggerLibraryEvent();
    }).then(function(result) {
      assert.equal(result.logs.length, 1);
      var log = result.logs[0];
      assert.equal(log.event, "LibraryEvent");
    }).then(done).catch(done);

  });
});
