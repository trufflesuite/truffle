const assert = require("assert");
const sinon = require("sinon");
const request = require("request-promise");
const CompilerSupplier = require("../../compilerSupplier");
const {
  Docker,
  Native,
  Local,
  VersionRange
} = require("../../compilerSupplier/loadingStrategies");
const Config = require("@truffle/config");
const config = new Config();
let supplier;
const supplierOptions = { events: config.events };

describe("CompilerSupplier", () => {
  describe("load()", () => {
    describe("when a docker tag is specified in the config", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = {
          docker: "randoDockerTagzzz",
          version: "0.4.25"
        };
        supplier = new CompilerSupplier(supplierOptions);
        sinon.stub(Docker.prototype, "load").returns("called Docker");
      });
      afterEach(() => {
        Docker.prototype.load.restore();
      });

      it("calls load on the Docker strategy", done => {
        supplier
          .load()
          .then(({ solc }) => {
            assert(solc === "called Docker");
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
        supplierOptions.solcConfig = { version: "native" };
        supplier = new CompilerSupplier(supplierOptions);
        sinon.stub(Native.prototype, "load").returns("called Native");
      });
      afterEach(() => {
        Native.prototype.load.restore();
      });

      it("calls load on the Native strategy", done => {
        supplier
          .load()
          .then(({ solc }) => {
            assert(solc === "called Native");
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
        supplierOptions.solcConfig = { version: undefined };
        supplier = new CompilerSupplier(supplierOptions);
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
          .then(({ solc }) => {
            assert(solc === "called VersionRange");
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
        supplierOptions.solcConfig = { version: "0.4.11" };
        supplier = new CompilerSupplier(supplierOptions);
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
          .then(({ solc }) => {
            assert(solc === "called VersionRange");
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      });
    });

    describe("when a user specifies the compiler url root", () => {
      beforeEach(() => {
        sinon.stub(VersionRange.prototype, "addFileToCache");
        sinon.stub(VersionRange.prototype, "versionIsCached").returns(false);
        sinon.stub(VersionRange.prototype, "fileIsCached").returns(false);
        sinon.stub(VersionRange.prototype, "compilerFromString");
        sinon
          .stub(request, "get")
          .withArgs(
            "https://ethereum.github.io/solc-bin/bin/soljson-v0.5.0+commit.1d4f565a.js"
          )
          .returns("response");
      });
      afterEach(() => {
        VersionRange.prototype.addFileToCache.restore();
        VersionRange.prototype.versionIsCached.restore();
        VersionRange.prototype.fileIsCached.restore();
        VersionRange.prototype.compilerFromString.restore();
        request.get.restore();
      });

      it("loads VersionRange with the user specified urls", done => {
        // This doesn't really verify that user provided list is being used but this in combination with next test does.
        // I am not sure what's the best way to check if user specified list is being used.
        supplierOptions.solcConfig = {
          version: "0.5.0",
          compilerRoots: ["https://ethereum.github.io/solc-bin/bin/"]
        };
        supplier = new CompilerSupplier(supplierOptions);
        supplier
          .load()
          .then(() => {
            assert(
              VersionRange.prototype.compilerFromString.calledWith("response")
            );
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      }).timeout(30000);

      it("throws an error on incorrect user url", done => {
        supplierOptions.solcConfig = {
          version: "0.5.6",
          compilerRoots: ["https://f00dbabe"]
        };
        supplier = new CompilerSupplier(supplierOptions);
        supplier
          .load()
          .then(() => {
            assert(false);
            done();
          })
          .catch(error => {
            let expectedMessageSnippet = "Could not find a compiler version";
            assert(error.message.includes(expectedMessageSnippet));
            done();
          });
      });
    });

    describe("when a solc version range is specified", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = { version: "^0.4.11" };
        supplier = new CompilerSupplier(supplierOptions);
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
          .then(({ solc }) => {
            assert(solc === "called VersionRange");
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
        supplierOptions.solcConfig = { version: "./some/path" };
        supplier = new CompilerSupplier(supplierOptions);
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
          .then(({ solc }) => {
            assert(solc === "called Local");
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
        supplierOptions.solcConfig = { version: "globbity gloop" };
        supplier = new CompilerSupplier(supplierOptions);
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
});
