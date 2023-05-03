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
        assert(error.message.includes("out of gas"), "Should OOG");
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
          e.stack.includes("out of gas"),
          "Should keep hijacked error description"
        );
        assert(
          e.stack.includes("/test/errors.js:"),
          "Should include original stack details"
        );
      }
    });
  });

  describe.only(".method(): errors", function () {
    // NB: call always takes +1 param: defaultBlock
    it("validates method arguments for .calls", async function () {
      try {
        const example = await Example.new(5);
        await example.getValue("apples", "oranges", "pineapples");
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("validation"),
          "should error on invalid params"
        );
      }
    });

    //todo web3js-migration remove skip
    it.skip("validates method arguments for .sends", async function () {
      const example = await Example.new(5);
      try {
        await example.setValue(5, 5);
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("validation"),
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
        assert(e.message.includes("out of gas"), "Error should be OOG");
      }
    });

    it("emits OOG errors", async function () {
      const example = await Example.new(1);
      const exampleEvent = example.setValue(10, { gas: 10 });
      exampleEvent.on("error", e => {
        assert(
          e.message.includes("intrinsic gas too low"),
          "Error should be OOG"
        );
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
        assert(
          e.innerError.data.message.includes("revert"),
          "Should include revert message"
        );
      }
    });

    it("errors with reason string on revert", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError();
        assert.fail();
      } catch (e) {
        assert.equal(
          e.innerError.data.reason,
          "reasonstring",
          "Should include reason property"
        );
        assert.include(
          e.innerError.data.message,
          "revert",
          "Should include reason in message"
        );
        assert.include(
          e.innerError.data.message,
          "revert",
          "Should include revert"
        );
      }
    });

    it("errors with reason string on revert (gas specified)", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError();
        assert.fail();
      } catch (e) {
        assert.equal(
          e.innerError.data.reason,
          "reasonstring",
          "Should include reason property"
        );
        assert.include(
          e.innerError.data.message,
          "revert",
          "Should include reason in message"
        );
      }
    });

    it("errors with panic code on panic", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerAssertError();
        assert.fail();
      } catch (e) {
        assert.include(
          e.innerError.data.message,
          "revert",
          "Should include panic reason in message"
        );
      }
    });

    it("errors with panic code on panic (gas specified)", async function () {
      this.timeout(10000);
      const example = await Example.new(1);
      try {
        await example.triggerAssertError();
        assert.fail();
      } catch (e) {
        assert.include(
          e.innerError.data.message,
          "revert",
          "Should include revert reason in message"
        );
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

    //todo web3js-migration Custom error is not reported
    it.skip("Reports that a custom error occurred when one did", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerCustomError();
        assert.fail();
      } catch (e) {
        console.log("***", e, "***");
        assert.include(e.reason, "Custom error");
        assert.include(e.message, "Custom error");
      }
    });

    it("Does not report a custom error when there is none", async function () {
      const example = await Example.new(1);
      //there was a bug where custom errors were incorrectly reported when
      //a function that returns a value failed due to OOG or due to not occurring
      //(e.g. refused in MetaMask).  This test is meant to check that case.
      try {
        await example.returnsInt.sendTransaction({ gas: 5 }); //deliberately too little gas
        assert.fail();
      } catch (e) {
        assert.notInclude(e.message, "Custom error");
      }
    });

    it("appends original stacktrace for .calls", async function () {
      const example = await Example.new(1);
      try {
        await example.getValue("apples", "oranges", "pineapples");
        assert.fail();
      } catch (e) {
        assert(
          e.message.includes("Web3 validator found 1 error"),
          "Should keep hijacked error description"
        );
        //todo there is not
        // assert(
        //   e.hijackedStack.includes("/test/errors.js:"),
        //   "Should include original stack details"
        // );
      }
    });

    it("appends original stacktrace for .sends", async function () {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError();
        assert.fail();
      } catch (e) {
        assert(
          e.innerError.message.includes("VM Exception"),
          "Should keep hijacked error details"
        );
        assert(
          e.innerError.message.includes("revert reasonstring"),
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
          e.message.includes(
            'value "foo" at "/0" must pass "uint256" validation'
          ),
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
          e.stack.includes(
            "VM Exception while processing transaction: out of gas"
          ),
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
