const assert = require("chai").assert;
const util = require("./util");

describe("Client appends errors (vmErrorsOnRPCResponse)", function () {
  let Example;
  const providerOptions = {
    hardfork: "istanbul",
    // ganache must use it's default instamine mode (eager) when the following is true
    vmErrorsOnRPCResponse: true
  };

  before(async function () {
    this.timeout(10000);

    Example = await util.createExample();

    await util.setUpProvider(Example, providerOptions);
  });

  describe(".new(): errors", function () {
    it("should reject on OOG", async function () {
      try {
        await Example.new(1, { gas: 10 });
        assert.fail();
      } catch (error) {
        assert(error.message.includes("intrinsic gas too low"), "Should OOG");
      }
    });

    it("emits OOG errors", function (done) {
      Example.new(1, { gas: 10 })
        .on("error", error => {
          assert(error.message.includes("intrinsic gas too low"), "Should OOG");
          done();
        })
        .catch(() => null);
    });

    it("errors w/o message if constructor reverts", async function () {
      try {
        await Example.new(13); // 13 fails a constructor require gate
        assert.fail();
      } catch (e) {
        assert(!e.reason, "Error should not include reason property");
        assert(
          !e.message.includes("Reason"),
          "Should not include reason message"
        );
      }
    });

    it("errors w/gas limit error if constructor reverts", async function () {
      try {
        await Example.new(13, { gas: 10000 }); // 13 fails a constructor require gate
        assert.fail();
      } catch (e) {
        assert(!e.reason, "Error should not include reason property");
        assert(
          !e.message.includes("Reason"),
          "Should not include reason message"
        );
        assert(
          e.message.includes("intrinsic gas too low"),
          "Error should be gas limit err"
        );
      }
    });

    it("errors w/reason string if constructor reverts", async function () {
      try {
        await Example.new(2001); // 2001 fails a constructor require gate w/ a reason
        assert.fail();
      } catch (e) {
        assert(
          e.reason === "reasonstring",
          "Error should include reason property"
        );
        assert(
          e.message.includes("reasonstring"),
          "Error message should include reason"
        );
      }
    });

    it("errors w/reason string and gas limit error if constructor reverts", async function () {
      try {
        await Example.new(2001, { gas: 100000 }); // 2001 fails a constructor require gate w/ a reason
        assert.fail();
      } catch (e) {
        assert(
          e.reason === "reasonstring",
          "Error should include reason property"
        );
        assert(
          e.message.includes("reasonstring"),
          "Error message should include reason"
        );
        assert(
          e.message.includes("intrinsic gas too low"),
          "Error should be gas limit err"
        );
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

    it("appends original stacktrace for OOG errors", async function () {
      try {
        await Example.new(1, { gas: 10 });
        assert.fail();
      } catch (e) {
        assert(
          e.stack.includes("Error: intrinsic gas too low"),
          "Should keep hijacked error description"
        );
        assert(
          e.stack.includes("/test/errors.js:"),
          "Should include original stack details"
        );
      }
    });
  });

  describe(".method(): errors", function () {
    // NB: call always takes +1 param: defaultBlock
    it("validates method arguments for .calls", async function () {
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

    it("validates method arguments for .sends", async function () {
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

    it("rejects on OOG", async function () {
      const example = await Example.new(1);
      try {
        await example.setValue(10, { gas: 10 });
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("intrinsic gas too low"),
          "Error should be OOG"
        );
      }
    });

    it("emits OOG errors", function (done) {
      Example.new(1).then(example => {
        example
          .setValue(10, { gas: 10 })
          .on("error", e => {
            assert(
              e.message.includes("intrinsic gas too low"),
              "Error should be OOG"
            );
            done();
          })
          .catch(() => null);
      });
    });

    it("errors with revert message", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerRequireError();
        assert.fail();
      } catch (e) {
        assert(!e.reason, "Should not include reasonstring");
        assert(
          !e.message.includes("Reason"),
          "Error message should not include reason"
        );
        assert(e.message.includes("revert"), "Should include revert message");
      }
    });

    it("errors with reason string on revert", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError();
        assert.fail();
      } catch (e) {
        assert.equal(
          e.reason,
          "reasonstring",
          "Should include reason property"
        );
        assert.include(
          e.message,
          "reasonstring",
          "Should include reason in message"
        );
        assert.include(e.message, "revert", "Should include revert");
      }
    });

    it("errors with reason string on revert (gas specified)", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError({ gas: 200000 });
        assert.fail();
      } catch (e) {
        assert.equal(
          e.reason,
          "reasonstring",
          "Should include reason property"
        );
        assert.include(
          e.message,
          "reasonstring",
          "Should include reason in message"
        );
        assert.include(e.message, "revert", "Should include revert");
      }
    });

    it("errors with panic code on panic", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerAssertError();
        assert.fail();
      } catch (e) {
        assert.equal(
          e.reason,
          "Panic: Failed assertion",
          "Should include reason property"
        );
        assert.include(
          e.message,
          "Failed assertion",
          "Should include panic reason in message"
        );
        assert.include(e.message, "Panic", "Should include 'Panic'");
      }
    });

    it("errors with panic code on panic (gas specified)", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerAssertError({ gas: 200000 });
        assert.fail();
      } catch (e) {
        assert.equal(
          e.reason,
          "Panic: Failed assertion",
          "Should include reason property"
        );
        assert.include(
          e.message,
          "Failed assertion",
          "Should include panic reason in message"
        );
        assert.include(e.message, "Panic", "Should include 'Panic'");
      }
    });

    it("errors with invalid opcode when gas specified", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerInvalidOpcode({ gas: 200000 });
        assert.fail();
      } catch (e) {
        assert(!e.reason, "Should not include reason string");
        assert(
          !e.message.includes("Reason"),
          "Should not include reason message"
        );
        assert(
          e.message.includes("invalid opcode"),
          "Should include invalid opcode"
        );
      }
    });

    it("errors with invalid opcode when gas not specified", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerInvalidOpcode();
        assert.fail();
      } catch (e) {
        assert(e.message.includes("invalid opcode"));
      }
    });

    // NB: this error is different than the `invalid` opcode error
    // produced when the vmErrors flag is on.
    it("errors with OOG on internal OOG", async function () {
      this.timeout(40000);

      const example = await Example.new(1);
      try {
        const accounts = await Example.web3.eth.getAccounts();
        await example.runsOutOfGas({ from: accounts[0], gasLimit: "0x6691b7" });
        assert.fail();
      } catch (e) {
        assert(e.message.includes("out of gas"));
      }
    });

    it("appends original stacktrace for .calls", async function () {
      const example = await Example.new(1);
      try {
        await example.getValue("apples", "oranges", "pineapples");
        assert.fail();
      } catch (e) {
        assert(
          e.stack.includes("Error: Invalid number of"),
          "Should keep hijacked error description"
        );
        assert(
          e.stack.includes("/test/errors.js:"),
          "Should include original stack details"
        );
      }
    });

    it("appends original stacktrace for .sends", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError();
        assert.fail();
      } catch (e) {
        assert(
          e.stack.includes("RuntimeError"),
          "Should keep hijacked error type"
        );
        assert(
          e.stack.includes("VM Exception"),
          "Should keep hijacked error details"
        );
        assert(
          e.stack.includes("revert reasonstring"),
          "Should keep hijacked error description"
        );
        assert(
          e.stack.includes("/test/errors.js:"),
          "Should include original stack details"
        );
      }
    });

    it("appends original stacktrace for argument parsing error", async function () {
      const example = await Example.new(1);
      try {
        await example.setValue("foo");
        assert.fail();
      } catch (e) {
        assert(
          e.stack.includes("Error: invalid BigNumber string"),
          "Should keep hijacked error description"
        );
        assert(
          e.stack.includes("/test/errors.js:"),
          "Should include original stack details"
        );
      }
    });

    it("appends original stacktrace for OOG errors", async function () {
      const example = await Example.new(1);
      try {
        await example.setValue(10, { gas: 10 });
        assert.fail();
      } catch (e) {
        assert(
          e.stack.includes("Error: intrinsic gas too low"),
          "Should keep hijacked error description"
        );
        assert(
          e.stack.includes("/test/errors.js:"),
          "Should include original stack details"
        );
      }
    });
  });
});
