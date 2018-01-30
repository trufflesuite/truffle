var assert = require("chai").assert;
var Schema = require("truffle-contract-schema");
var contract = require("../");
var temp = require("temp").track();
var path = require("path");
var solc = require("solc");
var fs = require("fs");
var requireNoCache = require("require-nocache")(module);
var util = require('./util');

describe.only("Abstractions", function() {
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

  describe("new (success cases)", function(){
    it("should set the transaction hash of the new contract instance", function() {
      return Example.new(1, {gas: 3141592}).then(function(example) {
        assert(example.transactionHash, "transactionHash should be non-empty");
      });
    });

    it("should emit the transactionHash before resolving the instance", function(done){
      var hash;
      Example.new(1, {gas: 3141592}).on('transactionHash', function(_hash){
        hash = _hash;
      }).then(function(example){
        assert.equal(example.transactionHash, hash, "contract hash should be emitted hash")
        done();
      });
    });

    // Only firing once...how is this done @ web3 / default block?
    it.skip("should fire the confirmations event handler repeatedly", function(done){
      var counter = 0;
      Example.new(1, {gas: 3141592}).on('confirmation', function(number, receipt){
        assert.equal(parseInt(receipt.status), 1, 'should have a receipt');
        number === 3 && done();
      }).then(function(example){
        example.setValue(5)
          .then(function(){ return example.setValue(10) })
          .then(function(){ return example.setValue(15) });
      })
    });

    it.skip("should estimate cost of deployment", function(done){

    });

    it("should reject on OOG", function(done){
      Example.new(1, {gas: 10}).on('error', function(error){
        assert(error.message.includes('base fee exceeds gas limit'), 'Error should be OOG');
        done();
      }).catch(function(e){
        // ignore
      })
    });

    it("should emit OOG errors", function(done){
      Example.new(1, {gas: 10}).on('error', function(error){
        assert(error.message.includes('base fee exceeds gas limit'), 'Error should be OOG');
        done();
      }).catch(function(e){
        // ignore
      })
    });

    // Clone needs to be implemented
    it.skip("should error if constructor reverts", function(done){
      var example = Example.clone();
      var options = {
        vmErrorsOnRPCResponse: false,
      };
      util.setUpProvider(example, options).then(function(){
        example.new(10000, {gas: 3141592}).then(function(instance) {
          assert.fail();
        }).catch(function(e){
          assert(e.message.includes('revert'), 'Error should be revert');
          assert(parseInt(e.receipt.status, 16) == 0)
          done();
        });
      })
    });

    it("should reject with web3 validation errors (constructor params)", function(done){
      Example.new(25, 25, {gas: 3141592}).then(function(){
        assert.fail();
      }).catch(function(error){
        // NB: constructor (?) message is unhelpful:
        // "Error: Invalid number of parameters for "undefined". Got 2 expected 1!""
        assert(error.message.includes("Invalid number of parameters"), "should throw web3 validation error");
        done();
      })
    });
  });

  describe('methods: (success cases)', function(){
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

    it("should execute constant functions as calls", function(done) {
      var example;
      Example.new(5, {gas: 3141592}).then(function(instance) {
        example = instance;
        return example.getValue();
      }).then(function(value) {
        assert.equal(value.valueOf(), 5, "Value should have been retrieved without explicitly calling .call()");
      }).then(done).catch(done);
    });

    it.skip("should honor the defaultBlock parameter when called", function(done){
      var example;
      var initialBlock;
      var nextBlock;
      var initialValue = new web3.utils.BN(5);

      Example.new(initialValue, {gas: 3141592}).then(function(instance) {
        example = instance;
        return new Promise(function(accept, reject){
          web3.eth.getBlockNumber(function(err, val){
            (err) ? reject(err) : accept(val);
          })
        });
      }).then(function(blockNumber) {
        initialBlock = blockNumber;
        return example.setValue(10, {gas: 3141592});
      }).then(function(tx){
        nextBlock = tx.receipt.blockNumber;
        return example.getValue(initialBlock);
      }).then(function(defaultBlockValue){
        assert.notEqual(initialBlock, nextBlock, "blockNumbers should differ");
        assert(initialValue.eq(defaultBlockValue), "should get initial value");
        return example.getValuePlus(10, initialBlock);
      }).then(function(defaultBlockValue){
        assert.equal(initialValue.plus(10).eq(defaultBlockValue), "should get inital value + 10");
        done();
      })
    });

    it('should estimate gas', function(done){
      Example.new(5, {gas: 3141592}).then(function(instance) {
        example = instance;
        return example.setValue.estimateGas(25);
      }).then(function(estimate) {
        assert.isNumber(estimate, 'Estimate should be a number');
        assert.isAbove(estimate, 0, 'Estimate should be non-zero');
        done();
      });
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

    it.skip("should allow BigNumbers as input parameters, and not confuse them as transaction objects", function(done) {
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
  });

  describe('methods: (error cases)', function(){
    // There's a bug here? We need to reset everything.
    // If you clone the Contract and change its provider
    // Source contract will have that provider. (Is this a web3 1.0 thing?)
    after(function(){
      return util.setUpProvider(Example).then(function(result){
        web3 = result.web3;
        accounts = result.accounts;
      });
    });

    it('should validate method arguments for .calls', function(done){
      var example;
      Example.new(5, {gas: 3141592}).then(function(instance) {
        example = instance;
        return example.getValue('apples', 5); // NB: one arg would be interpreted as defaultBlock
      }).then(function(value) {
        assert.fail();
      }).catch(function(error){
        assert(error.message.includes('parameters'), 'should error on invalid params');
        done();
      })
    });

    it('should validate method arguments for .sends', function(done){
      var example;
      Example.new(5, {gas: 3141592}).then(function(instance) {
        example = instance;
        return example.setValue(5, 5);
      }).then(function(value) {
        assert.fail();
      }).catch(function(error){
        assert(error.message.includes('parameters'), 'should error on invalid params');
        done();
      })
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
        var gas = new result.web3.utils.BN(200000);

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
  });

  describe("at / new(<address>)", function(){
    it('should return a usable copy with at()', function(){
      var example = null;
      var copy = null;
      return Example.new(1, {gas: 3141592}).then(function(instance) {
        example = instance;
        return Example.at(instance.address);
      }).then(function(_copy) {
        copy = _copy;
        return copy.value.call();
      }).then(function(value) {
        // Set via 'example'
        assert.equal(value.valueOf(), 1, "Starting value should be 1");
        return example.setValue(5);
      }).then(function(tx) {
        // Retrieve via 'copy'
        return copy.value.call();
      }).then(function(value) {
        assert.equal(value.valueOf(), 5, "Ending value should be five");
      })
    })
  });

  describe('sendTransaction / send', function(){
    it("should trigger the fallback function when calling sendTransaction()", function() {
      var example = null;
      return Example.new(1, {gas: 3141592}).then(function(instance) {
        example = instance;
        return example.fallbackTriggered();
      }).then(function(triggered) {
        assert(triggered == false, "Fallback should not have been triggered yet");
        return example.sendTransaction({
          value: web3.utils.toWei(1, "ether")
        });
      }).then(function(results) {
        return new Promise(function(accept, reject) {
          return web3.eth.getBalance(example.address, function(err, balance) {
            if (err) return reject(err);
            accept(balance);
          });
        });
      }).then(function(balance) {
        assert(balance == web3.utils.toWei(1, "ether"), "Balance should be 1 ether");
      })
    });

    it.skip("should trigger the fallback function when using a callback in sendTransaction()", function(){

    });

    it("should trigger the fallback function when calling send() (shorthand notation)", function() {
      var example = null;
      return Example.new(1, {gas: 3141592}).then(function(instance) {
        example = instance;
        return example.fallbackTriggered();
      }).then(function(triggered) {
        assert(triggered == false, "Fallback should not have been triggered yet");
        return example.send(web3.utils.toWei(1, "ether"));
      }).then(function(results) {
        return new Promise(function(accept, reject) {
          return web3.eth.getBalance(example.address, function(err, balance) {
            if (err) return reject(err);
            accept(balance);
          });
        });
      }).then(function(balance) {
        assert(balance == web3.utils.toWei(1, "ether"));
      });
    });
  })

  describe('network object', function(){
    it("errors when setting an invalid provider", function(done) {
      try {
        Example.setProvider(null);
        assert.fail("setProvider() should have thrown an error");
      } catch (e) {
        // Do nothing with the error.
      }
      done();
    });

    it("creates a network object when an address is set if no network specified", function() {
      var NewExample = contract({
        abi: abi,
        unlinked_binary: binary
      });

      return util.setUpProvider(NewExample).then(function(result){
        return result.web3.eth.net.getId().then(function(id) {
          network_id = id;

          assert.equal(NewExample.network_id, null);

          return NewExample.new(1, {gas: 3141592}).then(function(instance) {
            // We have a network id in this case, with new(), since it was detected,
            // but no further configuration.
            assert.equal(NewExample.network_id, network_id);
            assert.equal(NewExample.toJSON().networks[network_id], null);

            NewExample.address = instance.address;

            assert.equal(NewExample.toJSON().networks[network_id].address, instance.address);
          })
        })
      })
    });
  });
});
