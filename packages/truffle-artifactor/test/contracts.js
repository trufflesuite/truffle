var assert = require("chai").assert;
var Artifactor = require("../");
var contract = require("truffle-contract");
var Schema = require("truffle-contract-schema");
var temp = require("temp").track();
var path = require("path");
var solc = require("solc");
var fs = require("fs");
var requireNoCache = require("require-nocache")(module);
var TestRPC = require("ganache-cli");
var Web3 = require("web3");

describe("artifactor + require", function() {
  var Example;
  var accounts;
  var abi;
  var binary;
  var network_id;
  var artifactor;
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

    // Compile first
    var result = solc.compile(fs.readFileSync("./test/Example.sol", {encoding: "utf8"}), 1);

    // Clean up after solidity. Only remove solidity's listener,
    // which happens to be the first.
    process.removeListener("uncaughtException", process.listeners("uncaughtException")[0]);

    var compiled = Schema.normalize(result.contracts[":Example"]);
    abi = compiled.abi;
    binary = compiled.bytecode;

    // Setup
    var dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-test-contract-'
    });

    var expected_filepath = path.join(dirPath, "Example.json");

    artifactor = new Artifactor(dirPath);

    artifactor.save({
      contractName: "Example",
      abi: abi,
      binary: binary,
      address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01",
      network_id: network_id
    }).then(function() {
      var json = requireNoCache(expected_filepath);
      Example = contract(json);
      Example.setProvider(provider);
    }).then(done).catch(done);
  });

  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      accounts = accs;

      Example.defaults({
        from: accounts[0]
      });

      done(err);
    });
  });

  after(function(done) {
    temp.cleanupSync();
    done();
  });

  it("should set the transaction hash of contract instantiation", function() {
    return Example.new(1, {gas: 3141592}).then(function(example) {
      assert(example.transactionHash, "transactionHash should be non-empty");
    });
  });

  it("should get and set values via methods and get values via .call", function(done) {
    var example;
    Example.new(1, {gas: 3141592}).then(function(instance) {
      example = instance;
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 1, "Starting value should be 1");
      return example.setValue(5);
    }).then(function(tx) {
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 5, "Ending value should be five");
    }).then(done).catch(done);
  });

  it("shouldn't synchronize constant functions", function(done) {
    var example;
    Example.new(5, {gas: 3141592}).then(function(instance) {
      example = instance;
      return example.getValue();
    }).then(function(value) {
      assert.equal(value.valueOf(), 5, "Value should have been retrieved without explicitly calling .call()");
    }).then(done).catch(done);
  });

  it("should allow BigNumbers as input parameters, and not confuse them as transaction objects", function(done) {
    // BigNumber passed on new()
    var example = null;
    Example.new(web3.toBigNumber(30), {gas: 3141592}).then(function(instance) {
      example = instance;
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 30, "Starting value should be 30");
      // BigNumber passed in a transaction.
      return example.setValue(web3.toBigNumber(25), {gas: 3141592});
    }).then(function(tx) {
      return example.value.call();
    }).then(function(value) {
      assert.equal(value.valueOf(), 25, "Ending value should be twenty-five");
      // BigNumber passed in a call.
      return example.parrot.call(web3.toBigNumber(865));
    }).then(function(parrot_value) {
      assert.equal(parrot_value.valueOf(), 865, "Parrotted value should equal 865")
    }).then(done).catch(done);
  });

  it("should return transaction hash, logs and receipt when using synchronised transactions", function(done) {
    var example = null;
    Example.new(1, {gas: 3141592}).then(function(instance) {
      example = instance;
      return example.triggerEvent();
    }).then(function(result) {
      assert.isDefined(result.tx, "transaction hash wasn't returned");
      assert.isDefined(result.logs, "synchronized transaction didn't return any logs");
      assert.isDefined(result.receipt, "synchronized transaction didn't return a receipt");
      assert.isOk(result.tx.length > 42, "Unexpected transaction hash"); // There has to be a better way to do this.
      assert.equal(result.tx, result.receipt.transactionHash, "Transaction had different hash than receipt");
      assert.equal(result.logs.length, 1, "logs array expected to be 1");

      var log = result.logs[0];

      assert.equal("ExampleEvent", log.event);
      assert.equal(accounts[0], log.args._from);
      assert.equal(8, log.args.num); // 8 is a magic number inside Example.sol
    }).then(done).catch(done);
  });

  it("should trigger the fallback function when calling sendTransaction()", function() {
    var example = null;
    return Example.new(1, {gas: 3141592}).then(function(instance) {
      example = instance;
      return example.fallbackTriggered();
    }).then(function(triggered) {
      assert(triggered == false, "Fallback should not have been triggered yet");
      return example.sendTransaction({
        value: web3.toWei(1, "ether")
      });
    }).then(function(results) {
      return new Promise(function(accept, reject) {
        return web3.eth.getBalance(example.address, function(err, balance) {
          if (err) return reject(err);
          accept(balance);
        });
      });
    }).then(function(balance) {
      assert(balance == web3.toWei(1, "ether"));
    });
  });

  it("should trigger the fallback function when calling send() (shorthand notation)", function() {
    var example = null;
    return Example.new(1, {gas: 3141592}).then(function(instance) {
      example = instance;
      return example.fallbackTriggered();
    }).then(function(triggered) {
      assert(triggered == false, "Fallback should not have been triggered yet");
      return example.send(web3.toWei(1, "ether"));
    }).then(function(results) {
      return new Promise(function(accept, reject) {
        return web3.eth.getBalance(example.address, function(err, balance) {
          if (err) return reject(err);
          accept(balance);
        });
      });
    }).then(function(balance) {
      assert(balance == web3.toWei(1, "ether"));
    });
  });

  it("errors when setting an invalid provider", function(done) {
    try {
      Example.setProvider(null);
      assert.fail("setProvider() should have thrown an error");
    } catch (e) {
      // Do nothing with the error.
    }
    done();
  });

  it("creates a network object when an address is set if no network specified", function(done) {
    var NewExample = contract({
      abi: abi,
      unlinked_binary: binary
    });

    NewExample.setProvider(provider);
    NewExample.defaults({
      from: accounts[0]
    });

    assert.equal(NewExample.network_id, null);

    NewExample.new(1, {gas: 3141592}).then(function(instance) {
      // We have a network id in this case, with new(), since it was detected,
      // but no further configuration.
      assert.equal(NewExample.network_id, network_id);
      assert.equal(NewExample.toJSON().networks[network_id], null);

      NewExample.address = instance.address;

      assert.equal(NewExample.toJSON().networks[network_id].address, instance.address);

      done();
    }).catch(done);
  });

  it("doesn't error when calling .links() or .events() with no network configuration", function(done) {
    var event_abi = {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "nameHash",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "name": "releaseHash",
          "type": "bytes32"
        }
      ],
      "name": "PackageRelease",
      "type": "event"
    };

    var MyContract = contract({
      contractName: "MyContract",
      abi: [
        event_abi
      ],
      binary: "0x12345678",
    });

    MyContract.setNetwork(5);

    var expected_event_topic = web3.sha3("PackageRelease(bytes32,bytes32)");

    // We want to make sure these don't throw when a network configuration doesn't exist.
    // While we're at it, lets make sure we still get the event we expect.
    assert.deepEqual(MyContract.links, {});
    assert.deepEqual(MyContract.events[expected_event_topic], event_abi);

    done();
  });
});
