var assert = require("chai").assert;
var util = require("./util");

describe("Client appends errors (vmErrorsOnRPCResponse)", function() {
  var Example;
  var providerOptions = { vmErrorsOnRPCResponse: true }; // <--- TRUE

  before(async function() {
    this.timeout(10000);

    Example = await util.createExample();

    await util.setUpProvider(Example, providerOptions);
  });

  describe(".new(): errors", function() {
    it("should reject on OOG", async function() {
      try {
        await Example.new(1, { gas: 10 });
        assert.fail();
      } catch (error) {
        assert(error.message.includes("exceeds gas limit"), "Should OOG");
      }
    });

    it("should emit OOG errors", function(done) {
      Example.new(1, { gas: 10 })
        .on("error", error => {
          assert(error.message.includes("exceeds gas limit"), "Should OOG");
          done();
        })
        .catch(() => null);
    });

    it("should error w/ revert error if constructor reverts", async function() {
      try {
        await Example.new(13); // 13 fails a constructor require gate
        assert.fail();
      } catch (e) {
        assert(!e.reason, "Error should not include reason property");
        assert(
          !e.message.includes("Reason"),
          "Should not include reason message"
        );
        assert(e.message.includes("revert"), "Should include revert message");
      }
    });

    it("should error w/reason string if constructor reverts", async function() {
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
        assert(
          e.message.includes("revert reasonstring"),
          "Error should be revert w/ reason"
        );
      }
    });

    // NB: constructor (?) message is unhelpful:
    // "Error: Invalid number of parameters for "undefined". Got 2 expected 1!""
    it("should reject with web3 validation errors (constructor params)", async function() {
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

  describe(".method(): errors", function() {
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
        assert(e.message.includes("exceeds gas limit"), "Error should be OOG");
      }
    });

    it("should emit OOG errors", function(done) {
      Example.new(1).then(example => {
        example
          .setValue(10, { gas: 10 })
          .on("error", e => {
            assert(
              e.message.includes("exceeds gas limit"),
              "Error should be OOG"
            );
            done();
          })
          .catch(() => null);
      });
    });

    it("errors with revert message", async function() {
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

    it("errors with reason string on revert", async function() {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError();
        assert.fail();
      } catch (e) {
        assert(e.reason === "reasonstring", "Should include reason property");
        assert(e.message.includes("reasonstring"), "Should reason in message");
        assert(e.message.includes("revert"), "Should include revert message");
      }
    });

    it("errors with reason string on revert (gas specified)", async function() {
      const example = await Example.new(1);
      try {
        await example.triggerRequireWithReasonError({ gas: 200000 });
        assert.fail();
      } catch (e) {
        assert(e.reason === "reasonstring", "Should include reason property");
        assert(e.message.includes("reasonstring"), "Should reason in message");
        assert(e.message.includes("revert"), "Should include revert");
      }
    });

    it("errors with invalid opcode when gas specified", async function() {
      const example = await Example.new(1);
      try {
        await example.triggerAssertError({ gas: 200000 });
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

    it("errors with invalid opcode when gas not specified", async function() {
      const example = await Example.new(1);
      try {
        await example.triggerAssertError();
        assert.fail();
      } catch (e) {
        assert(e.message.includes("invalid opcode"));
      }
    });

    // NB: this error is different than the `invalid` opcode error
    // produced when the vmErrors flag is on.
    it("errors with OOG on internal OOG", async function() {
      this.timeout(5000);

      const example = await Example.new(1);
      try {
        const accounts = await Example.web3.eth.getAccounts();
        // specifying a gasLimit as ganache-core @2.7.0 no longer limits gas
        // estimations to the default block gas limit.
        await example.runsOutOfGas({ from: accounts[0], gasLimit: "0x6691b7" });
        assert.fail();
      } catch (e) {
        assert(e.message.includes("out of gas"));
      }
    });
  });
});
