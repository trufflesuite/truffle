var assert = require("chai").assert;
var Schema = require("truffle-contract-schema");
var temp = require("temp").track();
var path = require("path");
var solc = require("solc");

// Clean up after solidity. Only remove solidity's listener,
// which happens to be the first.
process.removeListener("uncaughtException", process.listeners("uncaughtException")[0] || function() {});

var fs = require("fs");
var requireNoCache = require("require-nocache")(module);
var debug = require("debug")("ganache-core");
var TestRPC = require("ganache-core");
var BlockchainUtils = require("truffle-blockchain-utils");
var contract = require("../");
var Web3 = require("web3");
var times = require("async/times");

var log = {
  log: debug
}

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

    var compiled = Schema.normalize(
      result.contracts["Example"] || result.contracts[":Example"]
    );
    abi = compiled.abi;
    binary = compiled.bytecode;

    // Setup
    network_one_id = 1000;
    network_two_id = 1001;
    network_one = TestRPC.provider({network_id: network_one_id, seed: network_one_id, logger: log});
    network_two = TestRPC.provider({network_id: network_two_id, seed: network_two_id, logger: log});

    network_one.__marker = "one";
    network_two.__marker = "two";

    done();
  }),

  before("Set up contracts", function() {
    ExampleOne = contract({
      contractName: "Example",
      abi: abi,
      binary: binary
    });
    ExampleTwo = ExampleOne.clone();

    ExampleOne.setProvider(network_one);
    ExampleTwo.setProvider(network_two);
  });

  before("Get/set first network accounts", function(done) {
    getAndSetAccounts(ExampleOne, done);
  });

  before("Get/set second network accounts", function(done) {
    getAndSetAccounts(ExampleTwo, done);
  });

  // Most tests rely on this. It was a test; now it's a before step.
  before("can deploy to different networks", function(done) {
    ExampleOne.new(1, {gas: 3141592}).then(function(example) {
      ExampleOne.address = example.address;
      return ExampleTwo.new(1, {gas: 3141592});
    }).then(function(example) {
      ExampleTwo.address = example.address;
    }).then(function() {
      done();
    }).catch(done);
  });

  after(function(done) {
    temp.cleanupSync();
    done();
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

  it("has no network if none set", function() {
    AnotherExample = contract({
      contractName: "AnotherExample",
      abi: abi,
      binary: binary
    });

    assert.equal(Object.keys(AnotherExample.toJSON().networks).length, 0);
  });

  it("auto-detects network when using deployed() as a thennable", function(done) {
    // For this test, we're using ExampleOne set up in the before() blocks. Note that
    // it has two networks, and the default network is the first one. We'll set the
    // provider to the second network, use the thennable version for deployed(), and
    // ensure the address that gets used is the one for the second network.
    var Example = contract(ExampleOne.toJSON());
    Example.setProvider(network_two);

    // Ensure preconditions
    assert.isNotNull(Example.toJSON().networks[network_one_id].address);
    assert.isNotNull(Example.toJSON().networks[network_two_id].address);
    assert.equal(Example.network_id, null);

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
    var Example = contract(ExampleOne.toJSON());

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

    var Example = contract(ExampleOne.toJSON());
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
    var Example = contract(ExampleOne.toJSON());
    Example.setProvider(network_two);

    // Ensure preconditions
    assert.isNotNull(Example.toJSON().networks[network_one_id].address);
    assert.isNotNull(Example.toJSON().networks[network_two_id].address);
    assert.equal(Example.network_id, null);

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
    var Example = contract(ExampleOne.toJSON());
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
    var Example = contract(ExampleOne.toJSON());
    Example.setProvider(network_two);

    // Ensure preconditions
    assert.isNotNull(Example.toJSON().networks[network_one_id].address);
    assert.isNotNull(Example.toJSON().networks[network_two_id].address);
    assert.equal(Example.network_id, null);

    Example.new(1, {from: ExampleTwo.defaults().from, gas: 3141592}).then(function(instance) {
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
    var ExampleSetup = contract(ExampleOne.toJSON());
    var ExampleDetect = ExampleSetup.clone();
    ExampleSetup.setProvider(network_two);
    ExampleDetect.setProvider(network_two);

    ExampleDetect.__marker = 12;
    ExampleSetup.__marker = "dummy";

    // Steal the from address from our other tests.
    var from = ExampleTwo.defaults().from;
    var example;

    return ExampleSetup.new(1, {from: from, gas: 3141592}).then(function(instance) {
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
    var ExampleSetup = contract(ExampleOne.toJSON());
    var ExampleDetect = ExampleSetup.clone();
    ExampleSetup.setProvider(network_two);
    ExampleDetect.setProvider(network_two);

    // Steal the from address from our other tests.
    var from = ExampleTwo.defaults().from;
    var example;

    return ExampleSetup.new(1, {from: from, gas: 3141592}).then(function(instance) {
      example = ExampleDetect.at(instance.address);

      assert.equal(ExampleDetect.network_id, null);

      return example.getValue({from: from, gas: 3141592});
    }).then(function() {
      assert.equal(ExampleDetect.network_id, network_two_id);
    });
  });

  it("detects the network when a blockchain uri is specified", function(done) {
    BlockchainUtils.asURI(network_two, function(err, uri) {
      if (err) return done(err);

      var json = {
        contractName: "NetworkExample",
        abi: abi,
        bytecode: binary,
        networks: {}
      };

      json.networks[uri] = {
        address: "0x1234567890123456789012345678901234567890" // fake
      }

      var NetworkExample = contract(json);

      NetworkExample.setProvider(network_two);

      NetworkExample.defaults({
        from: ExampleTwo.defaults().from // Borrow the address from this one.
      });

      NetworkExample.deployed().then(function(instance) {
        assert.equal(NetworkExample.network_id, uri);
        assert.equal(instance.address, json.networks[uri].address);
        done();
      }).catch(done);
    });
  });

  it("resolve networks artifacts when two matching but unequal blockchain uris are passed in", function(done) {
    BlockchainUtils.asURI(network_two, function(err, uri) {
      if (err) return done(err);

      var json = {
        contractName: "NetworkExampleTwo",
        abi: abi,
        bytecode: binary,
        networks: {}
      };

      json.networks[uri] = {
        address: "0x1234567890123456789012345678901234567890" // fake
      }

      var NetworkExample = contract(json);

      NetworkExample.setProvider(network_two);

      NetworkExample.defaults({
        from: ExampleTwo.defaults().from // Borrow the address from this one.
      });

      // This is what makes this test different than others. We're going to set
      // the network id to a number, but we're still going to expect it to resolve
      // to the correct set of artifacts identified by the blockchain uri, even
      // when the network id has been explicitly set.
      NetworkExample.setNetwork(network_two_id);

      NetworkExample.deployed().then(function(instance) {
        assert.equal(NetworkExample.network_id, uri);
        assert.equal(instance.address, json.networks[uri].address);
        done();
      }).catch(done);
    });
  });

  // TODO: Rewrite this as a promise chain
  it("resolve network artifacts when two equal but different network identifiers are passed in", function(done) {
    BlockchainUtils.asURI(network_two, function(err, uri) {
      if (err) return done(err);

      var json = {
        contractName: "NetworkExampleThree",
        abi: abi,
        bytecode: binary,
        networks: {}
      };

      json.networks[uri] = {
        address: "0x1234567890123456789012345678901234567890" // fake
      }

      var NetworkExample = contract(json);

      // Now send two transactions that, when finished, will ensure
      // we've mined two more blocks. We'll use ExampleTwo for this
      // that's hooked up to the same network.
      times(2, function(n, finished) {
        ExampleTwo.new(1, {gas: 3141592}).then(function() {
          finished();
        }).catch(finished);
      }, function(err) {
        if (err) return done(err);

        // Now get the blockchain URI again
        BlockchainUtils.asURI(network_two, function(err, new_uri) {
          if (err) return done(err);

          assert.notEqual(new_uri, uri);

          NetworkExample = contract(json);
          NetworkExample.setProvider(network_two);

          NetworkExample.defaults({
            from: ExampleTwo.defaults().from // Borrow the address from this one.
          });

          // We're setting the id to a URI that matches the same network as an already set URI
          // (but the URIs aren't equal).
          // We should get the address that's been saved as the URIs should match.
          NetworkExample.setNetwork(new_uri);

          NetworkExample.deployed().then(function(instance) {
            assert.equal(NetworkExample.network_id, uri);
            assert.equal(instance.address, json.networks[uri].address);
            done();
          }).catch(done);
        });
      });

    });
  });


});
