var assert = require("chai").assert;
var BigNumber = require("bignumber.js");
var temp = require("temp").track();
var path = require("path");
var fs = require("fs");
var util = require('./util');
var contract = require("../");

describe("Deployments", function() {
  var Example;
  var accounts;
  var network_id;
  var web3;
  var providerOptions = {vmErrorsOnRPCResponse: false};

  before(function() {
    this.timeout(10000);

    Example = util.createExample();

    return util
      .setUpProvider(Example, providerOptions)
      .then(result => {
        web3 = result.web3;
        accounts = result.accounts;
      });
  });

  after(() => temp.cleanupSync());

  describe(".at()", function(){
    it('should return a usable duplicate instance with at()', async function(){
      const example = await Example.new(1);
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

  describe(".new(): success", function(){

    it("should set the transaction hash of the new contract instance", async function() {
      const example = await Example.new(1)

      assert(example.transactionHash, "transactionHash should be non-empty");
    });

    it('should estimate gas cost of deployment', async function(){
      const estimate = await Example.new.estimateGas(5);

      assert.isNumber(estimate, 'Estimate should be a number');
      assert.isAbove(estimate, 0, 'Estimate should be non-zero');
    });

    it("should emit the transactionHash before resolving the instance", async function(){
      let txHash;
      const example = await Example.new(1).on('transactionHash', hash => txHash = hash);

      assert.equal(example.transactionHash, txHash, "contract tx hash should be emitted tx hash")
    });

    it("should fire the confirmations event handler repeatedly", function(done){

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

      Example.new(1)
        .on('confirmation', handler)
        .on('receipt', keepTransacting);
    });

    it('should automatically fund a deployment', async function(){
      const estimate = await Example.new.estimateGas(1);
      const defaults = Example.defaults;

      assert(defaults.gas === undefined, "Should not have a gas default");
      assert(estimate > 90000, "Should be more expensive than default tx");

      await Example.new(1);
    });

    // Constructor in this test consumes ~6437823 vs blockLimit of 6721975.
    it('should not multiply past the blockLimit', async function(){
      this.timeout(50000);
      const estimate = await Example.new.estimateGas(1200);
      const block = await web3.eth.getBlock('latest');
      const multiplier = Example.gasMultiplier;

      assert(multiplier === 1.25, "Multiplier should be initialized to 1.25");
      assert(!Number.isInteger(multiplier * estimate), "Test shoud multiply by a float");
      assert((multiplier * estimate) > block.gasLimit, "Multiplied estimate should be too high");
      assert(estimate < block.gasLimit, "Estimate on it's own should be ok");

      await Example.new(1200);
    });

    it.skip('should override the web3 50 blocks timeout and return a usable instance', async function(){
      this.timeout(50000);

      // Mock web3 non-response, fire error @ block 50, resolve receipt @ block 52.
      const tempSendTransaction = Example.web3.eth.sendTransaction;
      const tempGetTransactionReceipt = Example.web3.eth.getTransactionReceipt;

      Example.web3.eth.sendTransaction = util.fakeSendTransaction;
      Example.web3.eth.getTransactionReceipt = util.fakeNoReceipt;
      Example.timeoutBlocks = 52;

      const example = await Example.new(1)
        .on('transactionHash', async function(hash) {
          for(var i = 1; i < 50; i++){
            await util.evm_mine();
          }
          await util.fakeReject();
          await util.evm_mine();
          await util.evm_mine();
          Example.web3.eth.getTransactionReceipt = util.fakeGotReceipt;
          await util.evm_mine();
        });

      // Restore web3
      Example.web3.eth.sendTransaction = tempSendTransaction;
      Example.web3.eth.getTransactionReceipt = tempGetTransactionReceipt;

      await example.setValue(77);
      const newValue = await example.value();
      assert.equal(newValue, 77, "Should have returned a usable contract instance");
    });
  });

  describe(".new(): errors", function(){
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
        await Example.new(10000, {gas: 5000000})
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
        await Example.new(25, 25);
        assert.fail();
      } catch (e){
        assert(e.message.includes("Invalid number of parameters"), "web3 should validate");
      }
    });
  });
});