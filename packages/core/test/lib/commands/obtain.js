const assert = require("chai").assert;
const command = require("../../../lib/commands/obtain");
const sinon = require("sinon");
const {
  VersionRange
} = require("@truffle/compile-solidity/dist/compilerSupplier/loadingStrategies");
let options, solc;

describe("obtain", () => {
  describe(".run(options)", function () {
    beforeEach(() => {
      options = { solc: "0.5.3" };
      solc = { version: () => "0.5.3" };
      sinon.stub(VersionRange.prototype, "load").returns({ solc });
    });
    afterEach(() => {
      VersionRange.prototype.load.restore();
    });

    it("calls supplier.load()", async function () {
      await command.run(options);
      assert(VersionRange.prototype.load.calledWith());
    });

    describe("when options.solc is not present", async function () {
      beforeEach(() => {
        options.solc = undefined;
      });

      it("throws an error", async function () {
        try {
          await command.run(options);
          assert.fail("The run command should have failed");
        } catch (error) {
          assert(
            error.message.includes(
              "You have specified a compiler that is unsupported"
            )
          );
        }
      });
    });
  });
});
