var assert = require("chai").assert;
var BigNumber = require("bignumber.js");
var util = require("./util");

describe("Methods", function() {
  var Example;
  var accounts;
  var web3;
  var providerOptions = { vmErrorsOnRPCResponse: false };

  before(async function() {
    this.timeout(10000);

    Example = await util.createExample();

    return util.setUpProvider(Example, providerOptions).then(result => {
      web3 = result.web3;
      accounts = result.accounts;
    });
  });

  describe(".method(): success [ @geth ]", function() {
    it("should get and set values via methods and get values via .call", async function() {
      let value;
      const example = await Example.new(1);
      value = await example.value.call();

      assert.equal(value.valueOf(), 1, "Starting value should be 1");

      await example.setValue(5);
      value = await example.value.call();

      assert.equal(parseInt(value), 5, "Ending value should be five");
    });

    it("should execute constant functions as calls", async function() {
      const example = await Example.new(5);
      const value = await example.getValue();

      assert.equal(
        parseInt(value),
        5,
        "Should not need to explicitly use .call()"
      );
    });

    it("should execute overloaded solidity function calls", async function() {
      const example = await Example.new(5);
      const valueA = await example.methods["overloadedGet()"]();
      const valueB = await example.methods["overloadedGet(uint256)"](5);

      assert.equal(parseInt(valueA), 5, "Value should have been retrieved");
      assert.equal(
        parseInt(valueB),
        25,
        "Multiplied should have been retrieved"
      );
    });

    it("should honor the defaultBlock parameter when called", async function() {
      const expectedInitialValue = 5;

      const example = await Example.new(expectedInitialValue);
      const initialBlock = await web3.eth.getBlockNumber();
      const tx = await example.setValue(10);

      const nextBlock = tx.receipt.blockNumber;
      const retrievedInitialValue = await example.getValue(initialBlock);

      assert.notEqual(initialBlock, nextBlock, "blockNumbers should differ");
      assert.equal(
        expectedInitialValue,
        parseInt(retrievedInitialValue),
        "should get initial value"
      );

      const amountToAdd = 10;
      const expectedValuePlus = expectedInitialValue + amountToAdd;
      const retrievedValuePlus = await example.getValuePlus(
        amountToAdd,
        initialBlock
      );

      assert.equal(
        expectedValuePlus,
        retrievedValuePlus,
        "should get inital value + 10"
      );
    });

    it("should honor tx params when called", async function() {
      const example = await Example.new(5);
      const sender = await example.viewSender({ from: accounts[2] });
      assert.equal(sender, accounts[2]);
    });

    it("should estimate gas", async function() {
      const example = await Example.new(5);
      const estimate = await example.setValue.estimateGas(25);

      assert.isNumber(estimate, "Estimate should be a number");
      assert.isAbove(estimate, 0, "Estimate should be non-zero");
    });

    it("should return hash, logs and receipt when using synchronised transactions", async function() {
      const example = await Example.new(1);
      const result = await example.triggerEvent({ from: accounts[2] });
      const log = result.logs[0];

      assert.isDefined(result.tx, "transaction hash wasn't returned");
      assert.isDefined(
        result.logs,
        "synchronized transaction didn't return any logs"
      );
      assert.isDefined(
        result.receipt,
        "synchronized transaction didn't return a receipt"
      );
      assert.isOk(result.tx.length > 42, "Unexpected transaction hash");
      assert.equal(
        result.tx,
        result.receipt.transactionHash,
        "Tx had different hash than receipt"
      );
      assert.equal(result.logs.length, 1, "logs array expected to be 1");
      assert.equal("ExampleEvent", log.event);
      assert.equal(accounts[2], log.args._from);
      assert.equal(8, log.args.num); // 8 is a magic number inside Example.sol
    });

    it("should allow BigNumbers as input params, not treat them as tx objects", async function() {
      let value;
      const example = await Example.new(new BigNumber(30));

      value = await example.value.call();
      assert.equal(value.valueOf(), 30, "Starting value should be 30");

      await example.setValue(new BigNumber(25));

      value = await example.value.call();
      assert.equal(value.valueOf(), 25, "Ending value should be twenty-five");

      value = await example.parrot.call(new BigNumber(865));
      assert.equal(parseInt(value), 865, "Parrotted value should equal 865");

      // Arrays
      const numArray = [new BigNumber(1), new BigNumber(2)];

      await example.setNumbers(numArray);
      const numbers = await example.getNumbers();
      assert(numbers[0].toNumber() === 1);
      assert(numbers[1].toNumber() === 2);
    });

    it("should allow BN's as input params, not treat them as tx objects", async function() {
      let value;
      const example = await Example.new(new web3.utils.BN(30));

      value = await example.value.call();
      assert.equal(value.valueOf(), 30, "Starting value should be 30");

      await example.setValue(new web3.utils.BN(25));

      value = await example.value.call();
      assert.equal(value.valueOf(), 25, "Ending value should be twenty-five");

      value = await example.parrot.call(new web3.utils.BN(865));
      assert.equal(parseInt(value), 865, "Parrotted value should equal 865");

      // Arrays
      const numArray = [web3.utils.toBN(1), web3.utils.toBN(2)];

      await example.setNumbers(numArray);
      const numbers = await example.getNumbers();
      assert(numbers[0].toNumber() === 1);
      assert(numbers[1].toNumber() === 2);
    });

    it("should output uint tuples as BN by default (call)", async function() {
      let value;
      const example = await Example.new(1);

      value = await example.returnsNamedTuple();

      assert(web3.utils.isBN(value[0]));
      assert(typeof value[1] === "string");
      assert(web3.utils.isBN(value[2]));

      assert(web3.utils.isBN(value.hello));
      assert(typeof value.black === "string");
      assert(web3.utils.isBN(value.goodbye));

      value = await example.returnsUnnamedTuple();

      assert(typeof value[0] === "string");
      assert(web3.utils.isBN(value[1]));

      // uint sub-array
      assert(Array.isArray(value[2]));
      assert(web3.utils.isBN(value[2][0]));
      assert(web3.utils.isBN(value[2][1]));
    });

    it("should output uint array values as BN by default (call)", async function() {
      let value;
      const example = await Example.new(1);

      value = await example.returnsNamedStaticArray();
      assert(Array.isArray(value));
      assert(web3.utils.isBN(value[0]));
      assert(web3.utils.isBN(value[1]));

      value = await example.returnsUnnamedStaticArray();

      assert(Array.isArray(value));
      assert(web3.utils.isBN(value[0]));
      assert(web3.utils.isBN(value[1]));
    });

    it("should output nested uint array values as BN by default (call)", async function() {
      let value;
      const example = await Example.new(1);

      value = await example.returnsNamedStaticNestedArray();
      assert(Array.isArray(value));
      assert(Array.isArray(value[0]));
      assert(Array.isArray(value[1]));
      assert(web3.utils.isBN(value[0][0]));
      assert(web3.utils.isBN(value[0][1]));
      assert(web3.utils.isBN(value[1][0]));
      assert(web3.utils.isBN(value[1][1]));

      value = await example.returnsUnnamedStaticNestedArray();

      assert(Array.isArray(value));
      assert(Array.isArray(value[0]));
      assert(Array.isArray(value[1]));
      assert(web3.utils.isBN(value[0][0]));
      assert(web3.utils.isBN(value[0][1]));
      assert(web3.utils.isBN(value[1][0]));
      assert(web3.utils.isBN(value[1][1]));
    });

    it("should output int values as BN by default (call)", async function() {
      let value;
      const example = await Example.new(1);

      value = await example.returnsInt();
      assert(web3.utils.isBN(value));
    });

    it("should output uint tuples as BigNumber when set to 'BigNumber' (call)", async function() {
      let value;
      Example.numberFormat = "BigNumber";
      const example = await Example.new(1);

      value = await example.returnsNamedTuple();

      assert(web3.utils.isBigNumber(value[0]));
      assert(typeof value[1] === "string");
      assert(web3.utils.isBigNumber(value[2]));

      assert(web3.utils.isBigNumber(value.hello));
      assert(typeof value.black === "string");
      assert(web3.utils.isBigNumber(value.goodbye));

      value = await example.returnsUnnamedTuple();

      assert(typeof value[0] === "string");
      assert(web3.utils.isBigNumber(value[1]));

      // uint sub-array
      assert(Array.isArray(value[2]));
      assert(web3.utils.isBigNumber(value[2][0]));
      assert(web3.utils.isBigNumber(value[2][1]));

      Example.numberFormat = "BigNumber";
    });

    it("should output int values as string when set to 'String' (call)", async function() {
      let value;
      Example.numberFormat = "String";
      const example = await Example.new(1);

      value = await example.returnsInt();
      assert(typeof value === "string");
      Example.numberFormat = "BigNumber";
    });

    it("should emit a transaction hash", function(done) {
      Example.new(5).then(function(instance) {
        instance.setValue(25).on("transactionHash", function(hash) {
          assert.isString(hash, "Transaction hash should be a string");
          assert.isOk(hash.length > 42, "Unexpected transaction hash");
          done();
        });
      });
    });

    it("should emit a receipt", function(done) {
      Example.new(5).then(function(instance) {
        instance.setValue(25).on("receipt", function(receipt) {
          assert.isObject(receipt, "receipt should be an object");
          assert.isDefined(
            receipt.transactionHash,
            "receipt should have transaction hash"
          );
          done();
        });
      });
    });

    it("should fire the confirmations event handler repeatedly", function(done) {
      Example.new(5).then(example => {
        example
          .setValue(25)
          .on("confirmation", function(number, receipt) {
            if (number === 3) {
              assert(receipt.status === true);
              this.removeAllListeners();
              done();
            }
          })
          .then(async () => {
            await example.setValue(5);
            await example.setValue(10);
            await example.setValue(15);
          });
      });
    });

    it("should execute overloaded solidity fn sends", async function() {
      let hash;
      let value;
      const example = await Example.new(1);

      value = await example.value.call();
      assert.equal(parseInt(value), 1, "Starting value should be 1");

      let helloHash = web3.utils.soliditySha3("hello");
      await example.methods["overloadedSet(bytes32,uint256)"](helloHash, 5);

      hash = await example.hash.call();
      value = await example.value.call();

      assert.equal(hash, helloHash);
      assert.equal(parseInt(value), 5, "Ending value should be five");

      goodbyeHash = web3.utils.soliditySha3("goodbye");
      await example.methods["overloadedSet(bytes32,uint256,uint256)"](
        goodbyeHash,
        5,
        5
      );

      hash = await example.hash.call();
      value = await example.value.call();

      assert.equal(hash, goodbyeHash);
      assert.equal(parseInt(value), 25, "Ending value should be twenty five");
    });

    it("should automatically fund a tx that costs more than default gas (90k)", async function() {
      this.timeout(10000);

      const defaultGas = 90000;
      const instance = await Example.new(1);
      const estimate = await instance.isExpensive.estimateGas(777);

      assert(estimate > defaultGas, "Estimate should be too high");

      await instance.isExpensive(777);
    });
  });

  describe(".method(): errors [ @geth ]", function() {
    // NB: call always takes +1 param: defaultBlock
    it("should validate method arguments for .calls", async function() {
      const example = await Example.new(5);
      try {
        await example.getValue("apples", "oranges", "pineapples");
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("parameters"),
          "should error on invalid params"
        );
      }
    });

    it("should validate method arguments for .sends", async function() {
      const example = await Example.new(5);
      try {
        await example.setValue(5, 5);
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("parameters"),
          "should error on invalid params"
        );
      }
    });

    it("should reject on OOG", async function() {
      const example = await Example.new(1);
      try {
        await example.setValue(10, { gas: 10 });
        assert.fail();
      } catch (e) {
        const errorCorrect =
          e.message.includes("exceeds gas limit") ||
          e.message.includes("intrinsic gas too low");

        assert(errorCorrect, "Should OOG");
      }
    });

    it("should emit OOG errors", function(done) {
      Example.new(1).then(example => {
        example
          .setValue(10, { gas: 10 })
          .on("error", e => {
            const errorCorrect =
              e.message.includes("exceeds gas limit") ||
              e.message.includes("intrinsic gas too low");

            assert(errorCorrect, "Should OOG");
            done();
          })
          .catch(() => null);
      });
    });

    it("errors with failed tx message", async function() {
      const example = await Example.new(1);
      try {
        await example.triggerRequireError();
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("failing transaction"),
          "should return failed tx message!"
        );
        assert(e.receipt === undefined, "Expected no receipt");
      }
    });

    it("errors with receipt & assert message when gas specified", async function() {
      const example = await Example.new(1);
      try {
        await example.triggerAssertError({ gas: 200000 });
        assert.fail();
      } catch (e) {
        assert(e.message.includes("invalid opcode"));
        assert(e.receipt.status === false);
      }
    });

    it("errors with failed tx message when gas not specified", async function() {
      const example = await Example.new(1);
      try {
        await example.triggerAssertError();
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("failing transaction"),
          "should return failed tx message!"
        );
        assert(e.receipt === undefined, "Excected no receipt");
      }
    });

    it("errors with gas allowance error on internal OOG", async function() {
      this.timeout(25000);

      const example = await Example.new(1);
      try {
        await example.runsOutOfGas();
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("gas required exceeds allowance"),
          "should return gas allowance error"
        );
        assert(e.receipt === undefined, "Expected no receipt");
      }
    });

    it("errors with a revert reason", async function() {
      const example = await Example.new(1);
      try {
        // At the moment, this test can't rely on @truffle/contract's
        // gas estimation when running with geth.
        await example.triggerRequireWithReasonError({ gas: 1000000 });
        assert.fail();
      } catch (e) {
        assert(
          e.reason === "reasonstring",
          "Triggered require result should have revert reason field"
        );
        assert(
          e.message.includes("reasonstring"),
          "Triggered require should include reason in error message"
        );
        assert(
          e.receipt.status === false,
          "Triggered require should have receipt status:`false`"
        );
      }
    });

    it("errors when setting `numberFormat` to invalid value", async function() {
      try {
        Example.numberFormat = "bigNumber";
        assert.fail();
      } catch (err) {
        assert(err.message.includes("Invalid number format"));
        assert(err.message.includes("BigNumber"));
        assert(Example.numberFormat === "BigNumber");
      }
    });
  });

  describe("revert with reason (ganache only)", function() {
    it("errors with receipt and revert message", async function() {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError();
        assert.fail();
      } catch (e) {
        assert(e.reason === "reasonstring");
        assert(e.message.includes("reasonstring"));
        assert(e.message.includes("revert"));
        assert(e.receipt.status === false);
      }
    });
  });

  // This doesn't work on geth --dev because chainId is too high: 1337? Apparently
  // not configurable. Might work on a sub 100 id.
  describe.skip("web3 wallet", function() {
    it("should work with a web3.accounts.wallet account", async function() {
      let value;

      // Create and fund wallet account
      const wallet = web3.eth.accounts.wallet.create(1);
      const providerAccounts = await web3.eth.getAccounts();
      await web3.eth.sendTransaction({
        from: providerAccounts[0],
        to: wallet["0"].address,
        value: web3.utils.toWei("1", "ether")
      });

      const balance = await web3.eth.getBalance(wallet["0"].address);
      assert.equal(balance, web3.utils.toWei("1", "ether"));

      Example.setWallet(wallet);
      const example = await Example.new(1, { from: wallet["0"].address });

      value = await example.value.call();
      assert.equal(parseInt(value), 1, "Starting value should be 1");

      await example.setValue(5, { from: wallet["0"].address });

      value = await example.value.call();
      assert.equal(parseInt(value), 5, "Ending value should be 5");
    });
  });

  describe("sendTransaction() / send() [ @geth ]", function() {
    it("should trigger the fallback function when calling sendTransaction()", async function() {
      const example = await Example.new(1);
      const triggered = await example.fallbackTriggered();

      assert(
        triggered === false,
        "Fallback should not have been triggered yet"
      );

      await example.sendTransaction({
        value: web3.utils.toWei("1", "ether")
      });

      const balance = await web3.eth.getBalance(example.address);
      assert(
        balance === web3.utils.toWei("1", "ether"),
        "Balance should be 1 ether"
      );
    });

    it("should trigger the fallback function when calling send() (shorthand notation)", async function() {
      const example = await Example.new(1);
      const triggered = await example.fallbackTriggered();

      assert(
        triggered === false,
        "Fallback should not have been triggered yet"
      );

      await example.send(web3.utils.toWei("1", "ether"));

      const balance = await web3.eth.getBalance(example.address);
      assert(balance === web3.utils.toWei("1", "ether"));
    });

    it("should accept tx params (send)", async function() {
      const example = await Example.new(1);
      const eth = web3.utils.toWei("1", "ether");
      const sender = accounts[1];
      const initialSenderBalance = await web3.eth.getBalance(sender);

      await example.send(eth, { from: sender });

      const finalSenderBalance = await web3.eth.getBalance(sender);
      const contractBalance = await web3.eth.getBalance(example.address);

      assert(contractBalance === eth, "Contract should receive eth");

      const initialBN = new web3.utils.BN(initialSenderBalance);
      const finalBN = new web3.utils.BN(finalSenderBalance);
      const ethBN = new web3.utils.BN(eth);
      const expectedBN = initialBN.sub(ethBN);
      assert(
        finalBN.lte(expectedBN),
        "send should send from the specified address"
      );
    });

    it("should accept a data param (sendTransaction)", async function() {
      const example = await Example.new(1);

      // use sendTransaction to deliver encoded calldata to set value
      const calldata = example.contract.methods.setValue(5).encodeABI();
      await example.sendTransaction({ data: calldata });

      const value = await example.getValue();
      assert.equal(
        parseInt(value),
        5,
        "sendTransaction should persist data param"
      );
    });
  });
});
