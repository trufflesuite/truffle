const assert = require("chai").assert;
const util = require("./util");

describe("Deployments", function () {
  let Example;
  let web3;
  // ganache v2 had a default blockGasLimit of 0x6691b7, which these tests rely on
  const providerOptions = {
    hardfork: "istanbul",
    miner: {
      instamine: "strict",
      blockGasLimit: 0x6691b7
    }
  };
  before(async function () {
    this.timeout(20000);

    Example = await util.createExample();

    const result = await util.setUpProvider(Example, providerOptions);
    web3 = result.web3;
  });

  describe(".at() [ @geth ]", function () {
    it("returns a usable duplicate instance with at()", async function () {
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
    });
  });

  describe(".new(): success [ @geth ]", function () {
    it("sets the tx hash of the new contract instance", async function () {
      const example = await Example.new(1);

      assert(example.transactionHash, "transactionHash should be non-empty");
    });

    it("estimates gas cost of deployment", async function () {
      const estimate = await Example.new.estimateGas(5);

      assert.isNumber(estimate, "Estimate should be a number");
      assert.isAbove(estimate, 0, "Estimate should be non-zero");
    });

    it("emits the tx hash & set it on the resolved instance", async function () {
      let txHash;
      const example = await Example.new(1).on(
        "transactionHash",
        hash => (txHash = hash)
      );

      assert.equal(
        example.transactionHash,
        txHash,
        "contract tx hash should be emitted tx hash"
      );
    });

    it("fires the confirmations event handler repeatedly", function (done) {
      Example.new(5)
        .on("confirmation", function (number, receipt) {
          if (number === 3) {
            assert(receipt.status === true);
            this.removeAllListeners();
            done();
          }
        })
        .then(async instance => {
          await instance.setValue(5);
          await instance.setValue(10);
          await instance.setValue(15);
        });
    });
  });

  describe(".new(): errors [ @geth ]", function () {
    it("rejects on OOG", async function () {
      try {
        await Example.new(1, { gas: 10 });
        assert.fail();
      } catch (error) {
        const errorCorrect = error.message.includes("intrinsic gas too low");
        assert(errorCorrect, "Should OOG");
      }
    });

    it("emits OOG errors", function (done) {
      Example.new(1, { gas: 10 })
        .on("error", error => {
          const errorCorrect = error.message.includes("intrinsic gas too low");
          assert(errorCorrect, "Should OOG");
          done();
        })
        .catch(() => null);
    });

    it("Errors with exeuction reverted transaction error if constructor reverts", async function () {
      try {
        await Example.new(13); // 13 fails a require gate
        assert.fail();
      } catch (e) {
        const errorCorrect = e.message.includes("execution reverted");

        assert(errorCorrect, "Expected execution reverted transaction error");
        assert(e.receipt === undefined, "Expected no receipt");
      }
    });

    it(".new(): revert with reasonstring", async function () {
      try {
        await Example.new(2001); // 2001 fails a require gate
        assert.fail();
      } catch (e) {
        const errorCorrect = e.message.includes("reasonstring");

        assert(errorCorrect, "Expected reason string");
        assert(e.receipt === undefined, "Expected no receipt");
      }
    });

    // NB: constructor (?) message is unhelpful:
    // "Error: Invalid number of parameters for "undefined". Got 2 expected 1!""
    it("rejects with web3 validation errors (constructor params)", async function () {
      try {
        await Example.new(25, 25);
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("Invalid number of parameters"),
          "web3 should validate"
        );
      }
    });
  });

  describe(".new(): revert with reasonstring (ganache only)", function () {
    it("rejects with reason string on revert", async function () {
      try {
        await Example.new(2001); // Triggers error with a normal reason string
        assert.fail();
      } catch (error) {
        assert(error.message.includes("reasonstring"));
        assert(error.receipt === undefined, "Expected no receipt");
        assert(error.reason === "reasonstring");
      }
    });

    it("rejects with reason string on revert with too low intrinsic gas", async function () {
      try {
        await Example.new(2001, { gas: 10000 }); // Triggers error with a normal reason string
        assert.fail();
      } catch (error) {
        assert(error.message.includes("intrinsic gas too low"));
        assert(error.message.includes("reasonstring"));
        assert(error.receipt === undefined, "Expected no receipt");
        assert(error.reason === "reasonstring");
      }
    });

    it("rejects with long reason string on revert", async function () {
      try {
        await Example.new(20001); // Triggers error with a long reason string
        assert.fail();
      } catch (error) {
        assert(
          error.message.includes(
            "solidity storage is a fun lesson in endianness"
          )
        );
        assert(error.receipt === undefined, "Expected no receipt");
        assert(
          error.reason === "solidity storage is a fun lesson in endianness"
        );
      }
    });

    it("rejects with long reason string on revert with too low intrinsic gas", async function () {
      try {
        await Example.new(20001, { gas: 10000 }); // Triggers error with a long reason string
        assert.fail();
      } catch (error) {
        assert(error.message.includes("intrinsic gas too low"));
        assert(
          error.message.includes(
            "solidity storage is a fun lesson in endianness"
          )
        );
        assert(error.receipt === undefined, "Expected no receipt");
        assert(
          error.reason === "solidity storage is a fun lesson in endianness"
        );
      }
    });
  });

  describe("pre-flight gas estimation", function () {
    it("automatically funds a deployment [ @geth ]", async function () {
      const estimate = await Example.new.estimateGas(1);
      const defaults = Example.defaults;

      assert(defaults.gas === undefined, "Should not have a gas default");
      assert(estimate > 90000, "Should be more expensive than default tx");

      await Example.new(1);
    });

    it("is possible to turn gas estimation on and off", async function () {
      Example.autoGas = false;

      try {
        await Example.new(1);
        assert.fail();
      } catch (err) {
        assert(err.message.includes("intrinsic gas too low"), "Should OOG");
      }

      Example.autoGas = true;
      await Example.new(1);

      const estimate = await Example.new.estimateGas(1);

      Example.autoGas = false;
      await Example.new(1, { gas: estimate });

      Example.autoGas = true;
    });

    // Constructor in this test consumes ~6388773 (ganache) vs blockLimit of 6721975.
    it("doesn't multiply past the blockLimit", async function () {
      this.timeout(50000);
      let iterations = 5000; // # of times to set a uint in a loop, consuming gas.

      const estimate = await Example.new.estimateGas(iterations);
      const block = await web3.eth.getBlock("latest");
      const multiplier = Example.gasMultiplier;

      assert.equal(
        multiplier,
        1.25,
        "Multiplier should be initialized to 1.25"
      );
      assert(
        multiplier * estimate > block.gasLimit,
        "Multiplied estimate should be too high"
      );
      assert.isAtMost(
        estimate,
        block.gasLimit,
        "Estimate on its own should be ok"
      );

      await Example.new(iterations);
    });
  });

  describe("web3 timeout overrides", function () {
    it("overrides 50 blocks err / return a usable instance", async function () {
      this.timeout(50000);

      // Mock web3 non-response, fire error @ block 50, resolve receipt @ block 52.
      const tempSendTransaction = Example.web3.eth.sendTransaction;
      const tempGetTransactionReceipt = Example.web3.eth.getTransactionReceipt;

      Example.web3.eth.sendTransaction = util.fakeSendTransaction;
      Example.web3.eth.getTransactionReceipt = util.fakeNoReceipt;
      Example.timeoutBlocks = 52;

      const example = await Example.new(1).on(
        "transactionHash",
        async function () {
          for (var i = 1; i < 50; i++) {
            await util.evm_mine();
          }
          await util.fakeReject();
          await util.evm_mine();
          await util.evm_mine();
          Example.web3.eth.getTransactionReceipt = util.fakeGotReceipt;
          await util.evm_mine();
        }
      );

      // Restore web3
      Example.web3.eth.sendTransaction = tempSendTransaction;
      Example.web3.eth.getTransactionReceipt = tempGetTransactionReceipt;

      await example.setValue(77);
      const newValue = await example.value();
      assert.equal(
        newValue,
        77,
        "Should have returned a usable contract instance"
      );
    });

    it("overrides gateway tx propagation delay err / return a usable instance", async () => {
      // Mock web3 non-response, fire error @ block 50, resolve receipt @ block 52.
      const tempSendTransaction = Example.web3.eth.sendTransaction;
      const tempGetTransactionReceipt = Example.web3.eth.getTransactionReceipt;

      Example.web3.eth.sendTransaction = util.fakeSendTransaction;
      Example.web3.eth.getTransactionReceipt = util.fakeNoReceipt;
      Example.timeoutBlocks = 52;

      const example = await Example.new(1).on(
        "transactionHash",
        async function () {
          for (var i = 1; i < 50; i++) {
            await util.evm_mine();
          }
          await util.fakeGatewayDelay();
          await util.evm_mine();
          await util.evm_mine();
          Example.web3.eth.getTransactionReceipt = util.fakeGotReceipt;
          await util.evm_mine();
        }
      );

      // Restore web3
      Example.web3.eth.sendTransaction = tempSendTransaction;
      Example.web3.eth.getTransactionReceipt = tempGetTransactionReceipt;

      await example.setValue(77);
      const newValue = await example.value();
      assert.equal(
        newValue,
        77,
        "Should have returned a usable contract instance"
      );
    }).timeout(50000);
  });
});
