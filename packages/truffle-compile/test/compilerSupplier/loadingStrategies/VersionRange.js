const fs = require("fs");
const assert = require("assert");
const sinon = require("sinon");
const { VersionRange } = require("../../../compilerSupplier/loadingStrategies");

describe("VersionRange", () => {
  beforeEach(() => {
    instance = new VersionRange();
  });

  describe("versionIsCached(version)", () => {
    beforeEach(() => {
      const compilerFileNames = [
        "soljson-v0.4.22+commit.124ca40d.js",
        "soljson-v0.4.11+commit.124234rd.js",
        "soljson-v0.4.23+commit.1534a40d.js"
      ];
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
        assert.equal(
          VersionRange.prototype.versionIsCached("0.4.11"),
          expectedResult
        );
      });
    });

    describe("when a cached version of the compiler is not present", () => {
      beforeEach(() => {
        expectedResult = undefined;
      });

      it("returns undefined", () => {
        assert.equal(
          VersionRange.prototype.versionIsCached("0.4.29"),
          expectedResult
        );
      });
    });
  });

  describe("getCachedSolcByVersion(version)", () => {
    beforeEach(() => {
      const compilerFileNames = [
        "soljson-v0.4.22+commit.124ca40d.js",
        "soljson-v0.4.23+commit.1534a40d.js",
        "soljson-v0.4.11+commit.124234rd.js"
      ];
      sinon.stub(fs, "readdirSync").returns(compilerFileNames);
    });
    afterEach(() => {
      fs.readdirSync.restore();
    });

    describe("when there is only one valid compiler file", () => {
      beforeEach(() => {
        expectedFileName = "soljson-v0.4.11+commit.124234rd.js";
        sinon
          .stub(VersionRange.prototype, "getCachedSolcByFileName")
          .withArgs(expectedFileName)
          .returns("correct return");
      });
      afterEach(() => {
        VersionRange.prototype.getCachedSolcByFileName.restore();
      });

      it("calls getCachedSolcByFileName and returns the result", () => {
        assert(
          VersionRange.prototype.getCachedSolcByVersion("0.4.11"),
          "correct return"
        );
      });
    });

    describe("when there are multiple valid compiler files", () => {
      beforeEach(() => {
        expectedFileName = "soljson-v0.4.23+commit.1534a40d.js";
        sinon
          .stub(VersionRange.prototype, "getCachedSolcByFileName")
          .withArgs(expectedFileName)
          .returns("correct return");
      });
      afterEach(() => {
        VersionRange.prototype.getCachedSolcByFileName.restore();
      });

      it("calls getCachedSolcByFileName with the most recent compiler version and returns the result", () => {
        assert.equal(
          VersionRange.prototype.getCachedSolcByVersion("^0.4.15"),
          "correct return"
        );
      });
    });
  });

  describe("getFromCacheOrByUrl", () => {
    describe("when the version is cached", () => {});

    describe("when the version is not cached", () => {});
  });
});
