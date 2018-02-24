var assert = require("chai").assert;
var Schema = require("truffle-contract-schema");
var BigNumber = require("bignumber.js");
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

    var options = {
      vmErrorsOnRPCResponse: false,
    };

    util.setUpProvider(Example, options).then(function(result){
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

    it("should set the transaction hash of the new contract instance", async function() {
      const example = await Example.new(1, {gas: 3141592})

      assert(example.transactionHash, "transactionHash should be non-empty");
    });

    it('should estimate gas cost of deployment', async function(){
      const estimate = await Example.new.estimateGas(5);

      assert.isNumber(estimate, 'Estimate should be a number');
      assert.isAbove(estimate, 0, 'Estimate should be non-zero');
    });

    it("should emit the transactionHash before resolving the instance", async function(){
      let txHash;
      const example = await Example
                              .new(1, {gas: 3141592})
                              .on('transactionHash', hash => txHash = hash);

      assert.equal(example.transactionHash, txHash, "contract tx hash should be emitted tx hash")
    });

    // Only firing once...how is this done @ web3 / default block?
    it.skip("should fire the confirmations event handler repeatedly", function(done){

      function keepTransacting(){
        return util.evm_mine()
                .then(util.evm_mine)
                .then(util.evm_mine);
      };

      function handler(number, receipt){
        assert.equal(parseInt(receipt.status), 1, 'should have a receipt');
          if(number === 3){
            this.removeAllListeners();
            done();
          }
      }

      Example.new(1, {gas: 3141592})
        .on('confirmation', handler)
        .on('receipt', keepTransacting);
    });
  });

  describe('new (error cases)', function(){

    it("should reject on OOG", async function(){
      try {
        await Example.new(1, {gas: 10});
        assert.fail();
      } catch(error) {
        assert(error.message.includes('exceeds gas limit'), 'Should OOG');
      }
    });

    it("should emit OOG errors", function(done){
      Example
        .new(1, {gas: 10})
        .on('error', error => {
          assert(error.message.includes('exceeds gas limit'), 'Should OOG');
          done();
        })
        .catch(err => null);
    });

    it("should error if constructor reverts", async function(){
      try {
        await Example.new(10000, {gas: 3141592})
        assert.fail()
      } catch(e){
        assert(e.message.includes('revert'), 'Error should be revert');
        assert(parseInt(e.receipt.status, 16) == 0, 'Receipt status should be zero')
      }
    });

    // NB: constructor (?) message is unhelpful:
    // "Error: Invalid number of parameters for "undefined". Got 2 expected 1!""
    it("should reject with web3 validation errors (constructor params)", async function(){
      try {
        await Example.new(25, 25, {gas: 3141592});
        assert.fail();
      } catch (e){
        assert(e.message.includes("Invalid number of parameters"), "web3 should validate");
      }
    });
  });

  describe('methods: (success cases)', function(){

    it("should get and set values via methods and get values via .call", async function() {
      let value;
      const example = await Example.new(1, {gas: 3141592})
      value = await example.value.call();

      assert.equal(value.valueOf(), 1, "Starting value should be 1");

      await example.setValue(5);
      value = await example.value.call();

      assert.equal(parseInt(value), 5, "Ending value should be five");
    });

    it("should execute constant functions as calls", async function() {
      const example = await Example.new(5, {gas: 3141592})
      const value = await example.getValue();

      assert.equal(parseInt(value), 5, "Should not need to explicitly use .call()");
    });

    it("should execute overloaded solidity function calls", async function() {
      const example = await Example.new(5, {gas: 3141592})
      const valueA = await example.methods['overloadedGet()']();
      const valueB = await example.methods['overloadedGet(uint256)'](5);

      assert.equal(parseInt(valueA), 5, "Value should have been retrieved");
      assert.equal(parseInt(valueB), 25, "Multiplied should have been retrieved");
    })

    it.skip("should honor the defaultBlock parameter when called", async function(){
      const expectedInitialValue = 5;

      const example = await Example.new(initialValue, {gas: 3141592});
      const initialBlock = await web3.eth.getBlockNumber();
      const tx = await example.setValue(10);

      const nextBlock = tx.receipt.blockNumber;
      const retrievedInitialValue = await example.getValue(initialBlock);

      assert.notEqual(initialBlock, nextBlock, "blockNumbers should differ");
      assert.equal(expectedInitialValue, parseInt(retrievedInitialValue), "should get initial value");

      const amountToAdd = 10
      const expectedValuePlus = expectedInitialValue + amountToAdd;
      const retrievedValuePlus = await example.getValuePlus(amountToAdd, initialBlock);

      assert.equal(expectedValuePlus, retrievedValuePlus, "should get inital value + 10");
    });

    it('should estimate gas', async function(){
      const example = await Example.new(5, {gas: 3141592});
      const estimate = await example.setValue.estimateGas(25);

      assert.isNumber(estimate, 'Estimate should be a number');
      assert.isAbove(estimate, 0, 'Estimate should be non-zero');
    });

    it("should return hash, logs and receipt when using synchronised transactions", async function() {
      const example = await Example.new(1, {gas: 3141592});
      const result = await example.triggerEvent();
      const log = result.logs[0];

      assert.isDefined(result.tx, "transaction hash wasn't returned");
      assert.isDefined(result.logs, "synchronized transaction didn't return any logs");
      assert.isDefined(result.receipt, "synchronized transaction didn't return a receipt");
      assert.isOk(result.tx.length > 42, "Unexpected transaction hash"); // There has to be a better way to do this.
      assert.equal(result.tx, result.receipt.transactionHash, "Tx had different hash than receipt");
      assert.equal(result.logs.length, 1, "logs array expected to be 1");
      assert.equal("ExampleEvent", log.event);
      assert.equal(accounts[0], log.args._from);
      assert.equal(8, log.args.num); // 8 is a magic number inside Example.sol
    });

    it("should allow BigNumbers as input parameters, and not confuse them as tx objects", async function() {
      let value;
      const example = await Example.new( new BigNumber(30), {gas: 3141592})

      value = await example.value.call();
      assert.equal(value.valueOf(), 30, "Starting value should be 30");

      await example.setValue(new BigNumber(25), {gas: 3141592});

      value = await example.value.call();
      assert.equal(value.valueOf(), 25, "Ending value should be twenty-five");

      value = await example.parrot.call(new BigNumber(865));
      assert.equal(parseInt(value), 865, "Parrotted value should equal 865")
    });

    it("should allow BN's as input parameters, and not confuse them as tx objects", async function() {
      let value;
      const example = await Example.new( new web3.utils.BN(30), {gas: 3141592})

      value = await example.value.call();
      assert.equal(value.valueOf(), 30, "Starting value should be 30");

      await example.setValue(new web3.utils.BN(25), {gas: 3141592});

      value = await example.value.call();
      assert.equal(value.valueOf(), 25, "Ending value should be twenty-five");

      value = await example.parrot.call(new web3.utils.BN(865));
      assert.equal(parseInt(value), 865, "Parrotted value should equal 865")
    });

    it("should emit a transaction hash", function(done){
      Example.new(5, {gas: 3141592}).then(function(instance) {
        instance.setValue(25).on('transactionHash', function(hash){
          assert.isString(hash, 'Transaction hash should be a string');
          assert.isOk(hash.length > 42, "Unexpected transaction hash");
          done();
        });
      })
    });

    it("should emit a receipt", function(done){
      Example.new(5, {gas: 3141592}).then(function(instance) {
        instance.setValue(25).on('receipt', function(receipt){
          assert.isObject(receipt, 'receipt should be an object');
          assert.isDefined(receipt.transactionHash, "receipt should have transaction hash");
          done();
        });
      })
    });

    // Only firing once...how is this done @ web3 / default block?
    it.skip("should fire the confirmations event handler repeatedly", function(done){
      this.timeout(5000)
      function keepTransacting(){
        return util.evm_mine()
                .then(util.evm_mine)
                .then(util.evm_mine);
      };

      function handler(number, receipt){
        assert.equal(parseInt(receipt.status), 1, 'should have a receipt');
        if(number === 3) {
          this.removeAllListeners();
          done();
        }
      }

      Example.new(5, {gas: 3141592}).then(function(example) {
        example.setValue(25)
          .on('confirmation', handler)
          .then(keepTransacting);
      });
    });

    it("should execute overloaded solidity fn sends", async function() {
      let value;
      const example = await Example.new(1, {gas: 3141592});

      value = await example.value.call();
      assert.equal(parseInt(value), 1, "Starting value should be 1");

      await example.methods['overloadedSet(uint256)'](5);

      value = await example.value.call();
      assert.equal(parseInt(value), 5, "Ending value should be five");

      await example.methods['overloadedSet(uint256,uint256)'](5, 5);

      value = await example.value.call();
      assert.equal(parseInt(value), 25, "Ending value should be twenty five");
    });

    it("should work with a web3.accounts.wallet account", async function(){
      let value;

      // Create and fund wallet account
      const wallet = web3.eth.accounts.wallet.create(1);
      const providerAccounts = await web3.eth.getAccounts();
      await web3.eth.sendTransaction({
        from: providerAccounts[0],
        to: wallet["0"].address,
        value: web3.utils.toWei("1", 'ether')
      });

      const balance = await web3.eth.getBalance(wallet["0"].address);
      assert.equal(balance, web3.utils.toWei("1", 'ether'));

      Example.setWallet(wallet);
      const example = await Example.new(1, {gas: 3141592, from: wallet["0"].address })

      value = await example.value.call();
      assert.equal(parseInt(value), 1, "Starting value should be 1");

      await example.setValue(5, {from: wallet["0"].address})

      value = await example.value.call();
      assert.equal(parseInt(value), 5, "Ending value should be 5");
    });
  });

  describe('methods: (error cases)', function(){
    // NB: call always takes +1 param: defaultBlock
    it('should validate method arguments for .calls', async function(){
      const example = await Example.new(5, {gas: 3141592});
      try {
        await example.getValue('apples', 'oranges', 'pineapples');
        assert.fail();
      } catch(e){
        assert(e.message.includes('parameters'), 'should error on invalid params');
      }
    });

    it('should validate method arguments for .sends', async function(){
      const example = await Example.new(5, {gas: 3141592});
      try {
        await example.setValue(5, 5);
        assert.fail();
      } catch(e){
        assert(e.message.includes('parameters'), 'should error on invalid params');
      }
    });

    it("should reject on OOG", async function(){
      const example = await Example.new(1, {gas: 3141592});
      try {
        await example.setValue(10, {gas: 10});
        assert.fail();
      } catch(e){
        assert(e.message.includes('exceeds gas limit'), 'Error should be OOG');
      }
    });

    it("should emit OOG errors", function(done){
      Example.new(1, {gas: 3141592}).then(example => {
        example
          .setValue(10, {gas: 10})
          .on('error', e => {
            assert(e.message.includes('exceeds gas limit'), 'Error should be OOG');
            done();
          })
          .catch(e => null);
      });
    });

    it("errors with receipt and revert message", async function(){
      const example = await Example.new(1, {gas: 3141592})
      try {
        await example.triggerRequireError();
        assert.fail();
      } catch(e){
        assert(e.message.includes('revert'));
        assert(parseInt(e.receipt.status, 16) == 0)
      };
    });

    it("errors with receipt & assert message when gas specified", async function(){
      const example = await Example.new(1, {gas: 3141592})
      try {
        await example.triggerAssertError({gas: 200000});
        assert.fail();
      } catch(e){
        assert(e.message.includes('invalid opcode'));
        assert(parseInt(e.receipt.status, 16) == 0)
      }
    });

    it("errors with receipt & assert message when gas not specified", async function(){
      const example = await Example.new(1, {gas: 3141592})
      try {
        await example.triggerAssertError();
        assert.fail();
      } catch(e){
        assert(e.message.includes('invalid opcode'));
        assert(parseInt(e.receipt.status, 16) == 0)
      }
    });

    it("errors with receipt & assert message on internal OOG", async function(){
      const example = await Example.new(1, {gas: 3141592})
      try {
        await example.runsOutOfGas();
        assert.fail();
      } catch(e){
        assert(e.message.includes('invalid opcode'));
        assert(parseInt(e.receipt.status, 16) == 0)
      }
    });
  });

  describe("events", function(){
    it('should expose the "on" handler / format event correctly', function(done){
      Example.new(1, {gas: 3141592}).then(example => {
        const event = example.ExampleEvent()

        event.on('data', function(data){
          assert.equal("ExampleEvent", data.event);
          assert.equal(accounts[0], data.args._from);
          assert.equal(8, data.args.num); // 8 is a magic number inside Example.sol
          this.removeAllListeners();
          done();
        });

        example.triggerEvent();
      });
    });

    it('should expose the "once" handler', function(done){
      Example.new(1, {gas: 3141592}).then(example => {
        const event = example.ExampleEvent()

        event.once('data', function(data){
          assert.equal("ExampleEvent", data.event);
          assert.equal(accounts[0], data.args._from);
          assert.equal(8, data.args.num); // 8 is a magic number inside Example.sol
          this.removeAllListeners();
          done();
        });

        example.triggerEvent();
      });
    })

    // Emitter is firing twice for each event. :/
    it('should be possible to listen for events with a callback', function(done){
      let finished = false;
      const callback = (err, event) => {
        assert.equal("ExampleEvent", event.event);
        assert.equal(accounts[0], event.args._from);
        assert.equal(8, event.args.num);
        if (!finished){
          finished = true;
          done();
        }
      }

      Example.new(1, {gas: 3141592}).then(example => {
        example.ExampleEvent(callback);
        example.triggerEvent();
      })
    });

    // Emitter is firing twice for each event. :/
    it('should fire repeatedly', async function(){
      let emitter;
      let counter = 0;
      const example = await Example.new(1, {gas: 3141592})

      example
        .ExampleEvent()
        .on('data', function(data){
          emitter = this;
          counter++
        });

      await example.triggerEvent();
      await example.triggerEvent();
      await example.triggerEvent();

      assert(counter >= 3, 'emitter should have fired repeatedly');
      emitter.removeAllListeners();
    });
  });

  describe("at / new(<address>)", function(){
    it('should return a usable duplicate instance with at()', async function(){
      const example = await Example.new(1, {gas: 3141592});
      const copy = await Example.at(example.address);
      let value = await copy.value.call();

      // This value was set during Example's initialization;
      assert.equal(parseInt(value), 1, "Starting value should be 1");

      // Set via example
      await example.setValue(5);

      // Retrieve set value from copy
      value = await copy.value.call();
      assert.equal(parseInt(value), 5, "Ending value should be five");
    })
  });

  describe('sendTransaction / send', function(){
    it("should trigger the fallback function when calling sendTransaction()", async function() {
      const example = await Example.new(1, {gas: 3141592})
      const triggered = await example.fallbackTriggered();

      assert(triggered == false, "Fallback should not have been triggered yet");

      await example.sendTransaction({
        value: web3.utils.toWei("1", "ether")
      });

      const balance = await web3.eth.getBalance(example.address);
      assert(balance == web3.utils.toWei("1", "ether"), "Balance should be 1 ether");
    });

    it("should be possible to use callback in sendTransaction()", function(done){
      var example = null;
      var callback = results => {
        web3.eth.getBalance(example.address, (err, balance) => {
          if (err) done(err);
          assert(balance == web3.utils.toWei("1", "ether"));
          done();
        });
      }

      Example.new(1, {gas: 3141592}).then(instance => {
        example = instance;
        return example.fallbackTriggered();
      }).then(triggered => {
        assert(triggered == false, "Fallback should not have been triggered yet");
        example.sendTransaction({
          value: web3.utils.toWei("1", "ether")
        }, callback);
      })
    });

    it("should trigger the fallback function when calling send() (shorthand notation)", async function() {
      const example = await Example.new(1, {gas: 3141592});
      const triggered = await example.fallbackTriggered();

      assert(triggered == false, "Fallback should not have been triggered yet");

      await example.send(web3.utils.toWei("1", "ether"));

      const balance = await web3.eth.getBalance(example.address);
      assert(balance == web3.utils.toWei("1", "ether"));
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

    it("creates a network object when an address is set if no network specified", async function() {
      var NewExample = contract({
        abi: abi,
        unlinked_binary: binary
      });

      const result = await util.setUpProvider(NewExample)
      network_id = await result.web3.eth.net.getId()

      assert.equal(NewExample.network_id, null);

      const example = await NewExample.new(1, {gas: 3141592})
      // We have a network id in this case, with new(), since it was detected,
      // but no further configuration.
      assert.equal(NewExample.network_id, network_id);
      assert.equal(NewExample.toJSON().networks[network_id], null);

      NewExample.address = example.address;
      assert.equal(NewExample.toJSON().networks[network_id].address, example.address);
    });
  });
});
