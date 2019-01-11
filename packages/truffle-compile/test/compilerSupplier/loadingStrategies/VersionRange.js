const fs = require("fs");
const assert = require("assert");
const sinon = require("sinon");
const { VersionRange } = require("../../../compilerSupplier/loadingStrategies");
const instance = new VersionRange();
const compilerFileNames = [
  "soljson-v0.4.22+commit.124ca40d.js",
  "soljson-v0.4.23+commit.1534a40d.js",
  "soljson-v0.4.11+commit.124234rd.js"
];

describe("VersionRange loading strategy", () => {
  describe("versionIsCached(version)", () => {
    beforeEach(() => {
      sinon.stub(fs, "readdirSync").returns(compilerFileNames);
    });
    afterEach(() => {
      fs.readdirSync.restore();
    });

    describe("when a cached version of the compiler is present", () => {
      beforeEach(() => {
        expectedResult = "v0.4.11+commit.124234rd.js";
      });

      it("returns the file name with the prefix removed", () => {
        assert.equal(instance.versionIsCached("0.4.11"), expectedResult);
      });
    });

    describe("when a cached version of the compiler is not present", () => {
      beforeEach(() => {
        expectedResult = undefined;
      });

      it("returns undefined", () => {
        assert.equal(instance.versionIsCached("0.4.29"), expectedResult);
      });
    });
  });

  describe("getCachedSolcByVersionRange(version)", () => {
    beforeEach(() => {
      expectedResult = "soljson-v0.4.23+commit.1534a40d.js";
      sinon.stub(fs, "readdirSync").returns(compilerFileNames);
      sinon.stub(instance, "getCachedSolcByFileName");
    });
    afterEach(() => {
      fs.readdirSync.restore();
      instance.getCachedSolcByFileName.restore();
    });

    it("returns the compiler when a single version is specified", () => {
      instance.getCachedSolcByVersionRange("0.4.23");
      assert(instance.getCachedSolcByFileName.calledWith(expectedResult));
    });
    it("returns the newest compiler when there are multiple valid ones", () => {
      instance.getCachedSolcByVersionRange("^0.4.1");
      assert(instance.getCachedSolcByFileName.calledWith(expectedResult));
    });
  });
});
