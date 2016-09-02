// Override Pudding
var assert = require("chai").assert;
var Pudding = require("../");
var temp = require("temp").track();
var path = require("path");
var solc = require("solc");
var fs = require("fs");
var requireNoCache = require("./require-nocache");
var TestRPC = require("ethereumjs-testrpc");
var Web3 = require("web3");

function getNetworkId(provider, callback) {
  var web3 = new Web3();
  web3.setProvider(provider);

  web3.version.getNetwork(function(err, result) {
    if (err) return callback(err);

    callback(null, result);
  })
}

function getAndSetAccounts(contract, done) {
  contract.web3.eth.getAccounts(function(err, accs) {
    if (err) return done(err);

    contract.defaults({
      from: accs[0]
    });

    done(err);
  });
};

describe("Different networks:", function() {
  var binary;
  var abi;
  var network_one_id;
  var network_two_id;
  var ExampleOne;
  var ExampleTwo;

  before("Compile", function(done) {
    this.timeout(10000);

    // Compile first
    var result = solc.compile(fs.readFileSync("./test/Example.sol", {encoding: "utf8"}), 1);

    var compiled = result.contracts["Example"];
    abi = JSON.parse(compiled.interface);
    binary = compiled.bytecode;

    // Setup
    network_one = TestRPC.provider({
      // logger: {
      //   log: function(msg) {
      //     console.log("Network 1: " + msg)
      //   }
      // }
    });
    network_two = TestRPC.provider({
      // logger: {
      //   log: function(msg) {
      //     console.log("Network 2: " + msg)
      //   }
      // }
    });

    done();
  }),

  before("Get first network id", function(done) {
    getNetworkId(network_one, function(err, network_id) {
      network_one_id = network_id;
      done(err);
    });
  });

  before("Get second network id", function(done) {
    getNetworkId(network_two, function(err, network_id) {
      network_two_id = network_id;
      done(err);
    });
  });

  before("Set up contracts", function(done) {
    var dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-test-contract-'
    });

    var filepath = path.join(dirPath, "Example.sol.js")

    Pudding.save("Example", {
      abi: abi,
      binary: binary
    }, filepath, {network_id: network_one_id}).then(function() {
      return Pudding.save("Example", {
        abi: abi,
        binary: binary
      }, filepath, {network_id: network_two_id});
    }).then(function() {
      ExampleOne = requireNoCache(filepath);
      ExampleTwo = ExampleOne(network_two_id);

      ExampleOne.setProvider(network_one);
      ExampleTwo.setProvider(network_two);
    }).then(done).catch(done);
  });

  before("Get/set first network accounts", function(done) {
    getAndSetAccounts(ExampleOne, done);
  });

  before("Get/set second network accounts", function(done) {
    getAndSetAccounts(ExampleTwo, done);
  });

  after(function(done) {
    temp.cleanupSync();
    done();
  });

  it("can deploy to different networks", function(done) {
    ExampleOne.new().then(function(example) {
      ExampleOne.address = example.address;
      return ExampleTwo.new();
    }).then(function(example) {
      ExampleTwo.address = example.address;
    }).then(done).catch(done);
  });

  it("does not deploy to the same network (eth_getCode)", function(done) {
    function getCode(firstContract, secondContract, callback) {
      firstContract.web3.eth.getCode(secondContract.address, callback);
    }

    getCode(ExampleOne, ExampleTwo, function(err, code) {
      assert.equal(code, 0, "ExampleTwo's address must not exist on ExampleOne's network");

      getCode(ExampleTwo, ExampleOne, function(err, code) {
        assert.equal(code, 0, "ExampleOne's address must not exist on ExampleTwo's network");
        done();
      });
    })
  })
});
