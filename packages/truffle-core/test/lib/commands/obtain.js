const assert = require("chai").assert;
const command = require("../../../lib/commands/obtain");
const sinon = require("sinon");
const CompilerSupplier = require("truffle-compile").CompilerSupplier;
let options, done, solc;

describe("obtain", () => {
  describe(".run(options, done)", () => {
    beforeEach(() => {
      options = { solc: "0.5.3" };
      done = () => {};
      solc = { version: () => "0.5.3" };
      sinon
        .stub(CompilerSupplier.prototype, "downloadAndCacheSolc")
        .returns(solc);
    });
    afterEach(() => {
      CompilerSupplier.prototype.downloadAndCacheSolc.restore();
    });

    it("calls downloadAndCacheSolc on the supplier with the version", async () => {
      await command.run(options, done);
      assert(
        CompilerSupplier.prototype.downloadAndCacheSolc.calledWith("0.5.3")
      );
    });

    describe("when options.solc is present", () => {
      beforeEach(() => {
        options.solc = undefined;
        done = input => input;
      });

      it("calls done with an error", async () => {
        let returnValue = await command.run(options, done);
        assert.instanceOf(returnValue, Error);
      });
    });
  });
});
