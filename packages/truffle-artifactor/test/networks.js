var assert = require("chai").assert;
var Artifactor = require("../");
var temp = require("temp").track();
var path = require("path");
var solc = require("solc");
var fs = require("fs");
var requireNoCache = require("require-nocache")(module);
var TestRPC = require("ethereumjs-testrpc");
var BlockchainUtils = require("truffle-blockchain-utils");
var contract = require("truffle-contract");
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
  var temp_dir;
  var built_file_path;
  var network_one;
  var network_two;
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
    network_one_id = 1000;
    network_two_id = 1001;
    network_one = TestRPC.provider({network_id: network_one_id, seed: network_one_id});
    network_two = TestRPC.provider({network_id: network_two_id, seed: network_two_id});

    done();
  }),

  before("Set up contracts", function(done) {
    temp_dir = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-test-contract-'
    });

    artifactor = new Artifactor(temp_dir);

    built_file_path = path.join(temp_dir, "Example.json")

    artifactor.save({
      contract_name: "Example",
      abi: abi,
      binary: binary,
      network_id: network_one_id,
      default_network: network_one_id
    }).then(function() {
      return artifactor.save({
        contract_name: "Example",
        abi: abi,
        binary: binary,
        network_id: network_two_id
      });
    }).then(function(err) {
      var json = requireNoCache(built_file_path);
      ExampleOne = contract(json);
      ExampleTwo = ExampleOne.clone(network_two_id); // Mutate

      ExampleOne.__marker = "one";
      ExampleTwo.__marker = "two";

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
    ExampleOne.new({gas: 3141592}).then(function(example) {
      ExampleOne.address = example.address;
      return ExampleTwo.new({gas: 3141592});
    }).then(function(example) {
      ExampleTwo.address = example.address;
    }).then(function() {
      // Save the addresses.
      return artifactor.save(ExampleOne, built_file_path, {contract_name: "Example", network_id: network_one_id});
    }).then(function() {
      return artifactor.save(ExampleTwo, built_file_path, {contract_name: "Example", network_id: network_two_id});
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

  it("defaults to the default network set", function() {
    var json = requireNoCache(built_file_path);
    var Example = contract(json);

    // Network id should be null, meaning it's undected and not set explicitly.
    assert.equal(Example.network_id, null);

    // Network returned, however, should be the default.
    assert.deepEqual(Example.network, Example.toJSON().networks[network_one_id]);
  });

  it("has no network if none set", function(done) {
    var filepath = path.join(temp_dir, "AnotherExample.json")

    artifactor.save({
      contract_name: "AnotherExample",
      abi: abi,
      binary: binary
    }, filepath).then(function() {
      var json = requireNoCache(filepath);
      var AnotherExample = contract(json);

      assert.equal(AnotherExample.default_network, null);
      assert.equal(Object.keys(AnotherExample.toJSON().networks).length, 0);
    }).then(done).catch(done);
  });

  it("overwrites the default network if a new default network is specified", function(done) {
    var filepath = path.join(temp_dir, "AnotherExample.json")

    // NOTE: We are saving over the file already there!!!!
    artifactor.save({
      contract_name: "AnotherExample",
      abi: abi,
      binary: binary,
      network_id: "1010",
      default_network: "1010"
    }, filepath).then(function() {
      return artifactor.save({
        contract_name: "AnotherExample",
        abi: abi,
        binary: binary,
        network_id: "1337",
        default_network: "1337"
      }, filepath);
    }).then(function() {
      var json = requireNoCache(filepath);
      var AnotherExample = contract(json);

      assert.equal(AnotherExample.default_network, "1337");
      assert.equal(Object.keys(AnotherExample.toJSON().networks).length, 2);
    }).then(done).catch(done);
  });

  it("errors if address is specified but a network id is not", function(done) {
    var filepath = path.join(temp_dir, "AnotherExample.json")

    var network_id = "1337";
    var address = "0x1234567890123456789012345678901234567890";

    // NOTE: We are saving over the file already there!!!! AGAIN
    artifactor.save({
      contract_name: "AnotherExample",
      abi: abi,
      binary: binary,
      address: address
    }, filepath).then(function() {
      done(new Error("Should have received an error."))
    }).catch(function(e) {
      done(); // Got the error we were looking for
    });
  });

  it("does not overwrite the default network if default is unspecifed", function(done) {
    var filepath = path.join(temp_dir, "AnotherExample.json")

    var default_network_from_last_test = "1337";
    var network_id = "1414";
    var address = "0x1234567890123456789012345678901234567890";

    // NOTE: We are saving over the file already there!!!! AGAIN
    artifactor.save({
      contract_name: "AnotherExample",
      abi: abi,
      binary: binary,
      address: address,
      network_id: network_id
    }, filepath).then(function() {
      var json = requireNoCache(filepath);
      var AnotherExample = contract(json);

      assert.equal(AnotherExample.default_network, default_network_from_last_test);
      assert.equal(Object.keys(AnotherExample.toJSON().networks).length, 3); // Last three tests have used this file
      // Ensure we wrote to the correct network
      assert.equal(AnotherExample.toJSON().networks[network_id].address, address);
      assert.isUndefined(AnotherExample.toJSON().networks[default_network_from_last_test].address);
    }).then(done).catch(done);
  });

  it("auto-detects network when using deployed() as a thennable", function(done) {
    // For this test, we're using ExampleOne set up in the before() blocks. Note that
    // it has two networks, and the default network is the first one. We'll set the
    // provider to the second network, use the thennable version for deployed(), and
    // ensure the address that gets used is the one for the second network.
    var json = requireNoCache(built_file_path);
    var Example = contract(json);
    Example.setProvider(network_two);

    // Ensure first network is the default network (precondition).
    assert.equal(Example.default_network, network_one_id);
    assert.isNotNull(Example.toJSON().networks[network_one_id].address);
    assert.isNotNull(Example.toJSON().networks[network_two_id].address);
    assert.equal(Example.address, Example.toJSON().networks[network_one_id].address);

    // Thennable checker. Since this is a custom then function, let's ensure things
    // get executed in the right order.
    var execution_count = 0;

    Example.deployed().then(function(instance) {
      assert.equal(instance.address, Example.toJSON().networks[network_two_id].address);

      // Now up the execution count and move on to the next then statement
      // ensuring the chain remains intact.
      execution_count = 1;
      return execution_count;
    }).then(function(count) {
      assert.equal(execution_count, 1);
      assert.equal(count, 1);
    }).then(done).catch(done);
  });

  it("deployed() used as a thennable funnels errors correctly", function(done) {
    var json = requireNoCache(built_file_path);
    var Example = contract(json);

    // No provider is set. Using deployed().then() should send errors down the promise chain.
    Example.deployed().then(function() {
      assert.fail("This function should never be run because there should have been an error.");
    }).catch(function(err) {
      if (err.message.indexOf("Provider not set or invalid") < 0) return done(new Error("Unexpected error received: " + err.message));
      done();
    });
  });

  it("deployed() used as a thennable will error if contract hasn't been deployed to the network detected", function(done) {
    var network_three = TestRPC.provider();

    var json = requireNoCache(built_file_path);
    var Example = contract(json);
    Example.setProvider(network_three);

    Example.deployed().then(function() {
      assert.fail("This function should never be run because there should have been an error.");
    }).catch(function(err) {
      if (err.message.indexOf("Example has not been deployed to detected network") < 0) return done(new Error("Unexpected error received: " + err.message));
      done();
    });
  });

  it("auto-detects network when using at() as a thennable", function(done) {
    // For this test, we're using ExampleOne set up in the before() blocks. Note that
    // it has two networks, and the default network is the first one. We'll set the
    // provider to the second network, use the thennable version for at(), and
    // ensure the abi that gets used is the one for the second network.
    var json = requireNoCache(built_file_path);
    var Example = contract(json);
    Example.setProvider(network_two);

    // Ensure first network is the default network (precondition).
    assert.equal(Example.default_network, network_one_id);
    assert.isNotNull(Example.toJSON().networks[network_one_id].address);
    assert.isNotNull(Example.toJSON().networks[network_two_id].address);
    assert.equal(Example.address, Example.toJSON().networks[network_one_id].address);

    // Thennable checker. Since this is a custom then function, let's ensure things
    // get executed in the right order.
    var execution_count = 0;
    var exampleTwoAddress = Example.toJSON().networks[network_two_id].address;

    Example.at(exampleTwoAddress).then(function(instance) {
      assert.equal(instance.address, exampleTwoAddress);
      assert.deepEqual(instance.abi, Example.abi);

      // Now up the execution count and move on to the next then statement
      // ensuring the chain remains intact.
      execution_count = 1;
      return execution_count;
    }).then(function(count) {
      assert.equal(execution_count, 1);
      assert.equal(count, 1);
    }).then(done).catch(done);
  });

  it("at() used as a thennable funnels errors correctly", function(done) {
    var json = requireNoCache(built_file_path);
    var Example = contract(json);
    Example.setProvider(network_one);

    // This address should have no code there. .at().then() should error before
    // letting you execute anything else.
    Example.at("0x1234567890123456789012345678901234567890").then(function() {
      assert.fail("This function should never be run because there should have been an error.");
    }).catch(function(err) {
      if (err.message.indexOf("Cannot create instance of Example; no code at address 0x1234567890123456789012345678901234567890") < 0) return done(new Error("Unexpected error received: " + err.message));
      done();
    });
  });

  it("new() detects the network before deploying", function(done) {
    // For this test, we're using ExampleOne set up in the before() blocks. Note that
    // it has two networks, and the default network is the first one. We'll set the
    // provider to the second network, use the thennable version for at(), and
    // ensure the abi that gets used is the one for the second network.
    var json = requireNoCache(built_file_path);
    var Example = contract(json);
    Example.setProvider(network_two);

    // Ensure first network is the default network (precondition).
    assert.equal(Example.default_network, network_one_id);
    assert.isNotNull(Example.toJSON().networks[network_one_id].address);
    assert.isNotNull(Example.toJSON().networks[network_two_id].address);
    assert.equal(Example.address, Example.toJSON().networks[network_one_id].address);

    Example.new({from: ExampleTwo.defaults().from, gas: 3141592}).then(function(instance) {
      assert.deepEqual(instance.abi, Example.abi);
    }).then(done).catch(done);
  });

  it("detects the network before sending a transaction", function() {
    // Here, we're going to use two of the same contract abstraction to test
    // network detection. The first is going to deploy a new contract, thus
    // detecting the network in the process of new(); we're then going to
    // pass that address to the second and have it make a transaction.
    // During that transaction it should detect the network since it
    // hasn't been detected already.
    var json = requireNoCache(built_file_path);
    var ExampleSetup = contract(json);
    var ExampleDetect = ExampleSetup.clone();
    ExampleSetup.setProvider(network_two);
    ExampleDetect.setProvider(network_two);

    ExampleDetect.__marker = 12;
    ExampleSetup.__marker = "dummy";

    // Steal the from address from our other tests.
    var from = ExampleTwo.defaults().from;
    var example;

    return ExampleSetup.new({from: from, gas: 3141592}).then(function(instance) {
      example = ExampleDetect.at(instance.address);

      assert.equal(ExampleDetect.network_id, null);

      return example.setValue(47, {from: from, gas: 3141592});
    }).then(function() {
      assert.equal(ExampleDetect.network_id, network_two_id);
    });
  });

  it("detects the network when making a call", function() {
    // Here, we're going to use two of the same contract abstraction to test
    // network detection. The first is going to deploy a new contract, thus
    // detecting the network in the process of new(); we're then going to
    // pass that address to the second and have it make a transaction.
    // During that transaction it should detect the network since it
    // hasn't been detected already.
    var json = requireNoCache(built_file_path);
    var ExampleSetup = contract(json);
    var ExampleDetect = ExampleSetup.clone();
    ExampleSetup.setProvider(network_two);
    ExampleDetect.setProvider(network_two);

    // Steal the from address from our other tests.
    var from = ExampleTwo.defaults().from;
    var example;

    return ExampleSetup.new({from: from, gas: 3141592}).then(function(instance) {
      example = ExampleDetect.at(instance.address);

      assert.equal(ExampleDetect.network_id, null);

      return example.getValue({from: from, gas: 3141592});
    }).then(function() {
      assert.equal(ExampleDetect.network_id, network_two_id);
    });
  });

  it("detects the network when a blockchain uri is specified", function(done) {
    var filepath = path.join(temp_dir, "NetworkExample.json");

    BlockchainUtils.asURI(network_two, function(err, uri) {
      if (err) return done(err);

      var NetworkExample;

      artifactor.save({
        contract_name: "NetworkExample",
        abi: abi,
        unlinked_binary: binary,
        network_id: uri,
        address: "0x1234567890123456789012345678901234567890" // fake
      }, filepath).then(function() {
        if (err) return done(err);

        var json = requireNoCache(filepath);

        NetworkExample = contract(json);
        NetworkExample.setProvider(network_two);

        NetworkExample.defaults({
          from: ExampleTwo.defaults().from // Borrow the address from this one.
        });

        return NetworkExample.new({gas: 3141592});
      }).then(function(instance) {
        assert.equal(NetworkExample.network_id, uri);
        done();
      }).catch(done);
    });

  });
});
