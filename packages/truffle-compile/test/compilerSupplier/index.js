const assert = require("assert");
const sinon = require("sinon");
const fs = require("fs");
const CompilerSupplier = require("../../compilerSupplier");
const {
  Docker,
  Native,
  Local,
  Bundled,
  VersionRange
} = require("../../compilerSupplier/loadingStrategies");
let expectedResult, expectedFileName, supplier, config;

describe("CompilerSupplier", () => {
  describe("load()", () => {
    describe("when a docker tag is specified in the config", () => {
      beforeEach(() => {
        config = {
          docker: "randoDockerTagzzz",
          version: "0.4.25"
        };
        supplier = new CompilerSupplier(config);
        sinon.stub(Docker.prototype, "load").returns("called Docker");
      });
      afterEach(() => {
        Docker.prototype.load.restore();
      });

      it("calls load on the Docker strategy", done => {
        supplier
          .load()
          .then(result => {
            assert(result === "called Docker");
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      });
    });

    describe(`when the version is set to a specific word I can't write here`, () => {
      // HACK: Because of how the test script is set up, the word 'native' cannot be a
      // part of the it/describe strings above and below
      beforeEach(() => {
        config = { version: "native" };
        supplier = new CompilerSupplier(config);
        sinon.stub(Native.prototype, "load").returns("called Native");
      });
      afterEach(() => {
        Native.prototype.load.restore();
      });

      it("calls load on the Native strategy", done => {
        supplier
          .load()
          .then(result => {
            assert(result === "called Native");
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      });
    });

    describe("when no version is specified in the config", () => {
      beforeEach(() => {
        supplier = new CompilerSupplier();
        sinon.stub(Bundled.prototype, "load").returns("called Bundled");
      });
      afterEach(() => {
        Bundled.prototype.load.restore();
      });

      it("calls load on the Bundled strategy", done => {
        supplier
          .load()
          .then(result => {
            assert(result === "called Bundled");
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      });
    });

    describe("when a solc version is specified in the config", () => {
      beforeEach(() => {
        config = { version: "0.4.11" };
        supplier = new CompilerSupplier(config);
        sinon
          .stub(VersionRange.prototype, "load")
          .returns("called VersionRange");
      });
      afterEach(() => {
        VersionRange.prototype.load.restore();
      });

      it("calls load on the VersionRange strategy", done => {
        supplier
          .load()
          .then(result => {
            assert(result === "called VersionRange");
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      });
    });

    describe("when a solc version range is specified", () => {
      beforeEach(() => {
        config = { version: "^0.4.11" };
        supplier = new CompilerSupplier(config);
        sinon
          .stub(VersionRange.prototype, "load")
          .returns("called VersionRange");
      });
      afterEach(() => {
        VersionRange.prototype.load.restore();
      });

      it("calls load on the VersionRange strategy", done => {
        supplier
          .load()
          .then(result => {
            assert(result === "called VersionRange");
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      });
    });

    describe("when a path is specified in the config", () => {
      beforeEach(() => {
        config = { version: "./some/path" };
        supplier = new CompilerSupplier(config);
        sinon.stub(supplier, "fileExists").returns(true);
        sinon.stub(Local.prototype, "load").returns("called Local");
      });
      afterEach(() => {
        supplier.fileExists.restore();
        Local.prototype.load.restore();
      });

      it("calls load on the Local strategy", done => {
        supplier
          .load()
          .then(result => {
            assert(result === "called Local");
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      });
    });

    describe("when no valid values are specified", () => {
      beforeEach(() => {
        config = { version: "globbity gloop" };
        supplier = new CompilerSupplier(config);
      });

      it("throws an error", done => {
        supplier
          .load()
          .then(() => {
            assert(false);
            done();
          })
          .catch(error => {
            let expectedMessageSnippet = "version matching globbity gloop";
            assert(error.message.includes(expectedMessageSnippet));
            done();
          });
      });
    });
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
          CompilerSupplier.prototype.versionIsCached("0.4.11"),
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
          CompilerSupplier.prototype.versionIsCached("0.4.29"),
          expectedResult
        );
      });
    });
  });

  describe("getCached(version)", () => {
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
          .stub(CompilerSupplier.prototype, "getFromCache")
          .withArgs(expectedFileName)
          .returns("correct return");
      });
      afterEach(() => {
        CompilerSupplier.prototype.getFromCache.restore();
      });

      it("calls getFromCache and returns the result", () => {
        assert(
          CompilerSupplier.prototype.getCached("0.4.11"),
          "correct return"
        );
      });
    });

    describe("when there are multiple valid compiler files", () => {
      beforeEach(() => {
        expectedFileName = "soljson-v0.4.23+commit.1534a40d.js";
        sinon
          .stub(CompilerSupplier.prototype, "getFromCache")
          .withArgs(expectedFileName)
          .returns("correct return");
      });
      afterEach(() => {
        CompilerSupplier.prototype.getFromCache.restore();
      });

      it("calls getFromCache with the most recent compiler version and returns the result", () => {
        assert.equal(
          CompilerSupplier.prototype.getCached("^0.4.15"),
          "correct return"
        );
      });
    });
  });

  describe("prototype.getFromCacheOrByUrl", () => {
    describe("when the version is cached", () => {});

    describe("when the version is not cached", () => {});
  });
});
