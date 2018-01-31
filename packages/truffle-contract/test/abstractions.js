var assert = require("chai").assert;
var Schema = require("truffle-contract-schema");
var contract = require("../");
var temp = require("temp").track();
var path = require("path");
var solc = require("solc");
var fs = require("fs");
var requireNoCache = require("require-nocache")(module);
var util = require('./util');

describe("Abstractions", function() {
  var Example;
  var accounts;
  var abi;
  var binary;
  var network_id;
  var web3;

  before(function(done) {
    this.timeout(10000);

    // Compile first
    var result = solc.compile(fs.readFileSync("./test/Example.sol", {encoding: "utf8"}), 1);

    // Clean up after solidity. Only remove solidity's listener,
    // which happens to be the first.
    process.removeListener("uncaughtException", process.listeners("uncaughtException")[0]);

    var contractObj, contractName;
    if (result.contracts["Example"]) {
      contractName = "Example";
    } else {
      contractName = ":Example";
    }

    contractObj = result.contracts[contractName];
    contractObj.contractName = contractName;
    Example = contract(contractObj);

    // save abi and binary for later
    abi = Example.abi;
    binary = Example.bytecode;

    util.setUpProvider(Example).then(function(result){
      web3 = result.web3;
      accounts = result.accounts;
      done();
    }).catch(done);
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

  it("errors when creating a contract with invalid constructor params", function(){
    return Example.new(25, 25, {gas: 3141592}).then(function(){
      assert.fail();
    }).catch(function(error){
      assert(error.message.search("constructor") >= 0, "new() should have thrown");
    });
  });

  it("errors with a revert message when ganache appends an error to the response", function(done){
    var example = Example.clone();
    var options = {
      vmErrorsOnRPCResponse: true,
    };

    util.setUpProvider(example, options).then(function(){
      example.new(1, {gas: 3141592}).then(function(instance) {
        return instance.triggerRequireError()
      }).then(function(){
        assert.fail();
      }).catch(function(e){
        assert(e.message.includes('revert'))
        done();
      });
    }).catch(done);
  });

  it("errors with receipt and revert message (ganache err flag false)", function(done){
    var example = Example.clone();
    var options = {
      vmErrorsOnRPCResponse: false,
    };

    util.setUpProvider(example, options).then(function(){
      example.new(1, {gas: 3141592}).then(function(instance) {
        return instance.triggerRequireError()
      }).then(function(){
        assert.fail();
      }).catch(function(e){
        assert(e.message.includes('revert'));
        assert(parseInt(e.receipt.status, 16) == 0)
        done();
      });
    }).catch(done)
  });

  it("errors with receipt & assert message when gas specified (ganache err flag false)", function(done){
    var example = Example.clone();
    var options = {
      vmErrorsOnRPCResponse: false,
    };

    util.setUpProvider(example, options).then(function(result){
      var gas = result.web3.toBigNumber(200000);

      example.new(1, {gas: 3141592}).then(function(instance) {
        return instance.triggerAssertError({gas: gas});
      }).then(function(){
        assert.fail();
      }).catch(function(e){
        assert(e.message.includes('invalid opcode'));
        assert(parseInt(e.receipt.status, 16) == 0)
        done();
      });
    }).catch(done)
  });

  it("errors with receipt & assert message when gas not specified (ganache err flag false)", function(done){
    var example = Example.clone();
    var options = {
      vmErrorsOnRPCResponse: false,
    };

    util.setUpProvider(example, options).then(function(result){
      example.new(1, {gas: 3141592}).then(function(instance) {
        return instance.triggerAssertError();
      }).then(function(){
        assert.fail();
      }).catch(function(e){
        assert(e.message.includes('invalid opcode'));
        assert(parseInt(e.receipt.status, 16) == 0)
        done();
      });
    }).catch(done)
  });

  it("errors with receipt & assert message on internal OOG (ganache err flag false)", function(done){
    var example = Example.clone();
    var options = {
      vmErrorsOnRPCResponse: false,
    };

    util.setUpProvider(example, options).then(function(result){
      example.new(1, {gas: 3141592}).then(function(instance) {
        return instance.runsOutOfGas();
      }).then(function(){
        assert.fail();
      }).catch(function(e){
        assert(e.message.includes('invalid opcode'));
        assert(parseInt(e.receipt.status, 16) == 0)
        done();
      });
    }).catch(done)
  });

  it("creates a network object when an address is set if no network specified", function(done) {
    var NewExample = contract({
      abi: abi,
      unlinked_binary: binary
    });

    util.setUpProvider(NewExample).then(function(result){
      result.web3.version.getNetwork(function(err, id) {
        if (err) return done(err);
        network_id = id;

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
      })
    }).catch(done);
  });
});
