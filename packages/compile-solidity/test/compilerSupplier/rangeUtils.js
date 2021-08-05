const assert = require("assert");
const { RangeUtils } = require("../../dist/compilerSupplier/rangeUtils");

describe("rangeUtils", () => {
  describe(".rangeContainsAtLeast(range, comparisonVersion)", () => {
    describe("using a semver range for the range argument", () => {
      it("returns false if the whole range is less", async () => {
        const result = await RangeUtils.rangeContainsAtLeast("^0.5.0", "0.6.0");
        assert.equal(result, false);
      });
      it("returns true if the whole range is greater", async () => {
        const result = await RangeUtils.rangeContainsAtLeast("^0.5.0", "0.4.7");
        assert.equal(result, true);
      });
      it("returns true if the range contains the version", async () => {
        const result = await RangeUtils.rangeContainsAtLeast("^0.5.0", "0.5.11");
        assert.equal(result, true);
      });
    });
    describe("using a single version for the range argument", () => {
      it("returns false if the range arg is less", async () => {
        const result = await RangeUtils.rangeContainsAtLeast("0.5.0", "0.6.0");
        assert.equal(result, false);
      });
      it("returns true if the range arg is greater", async () => {
        const result = await RangeUtils.rangeContainsAtLeast("0.6.0", "0.5.7");
        assert.equal(result, true);
      });
      it("returns true if the version is the same", async () => {
        const result = await RangeUtils.rangeContainsAtLeast("0.5.0", "0.5.0");
        assert.equal(result, true);
      });
    });
  });
});
