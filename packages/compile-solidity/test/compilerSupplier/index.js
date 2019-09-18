const assert = require("assert");
const sinon = require("sinon");
const CompilerSupplier = require("../../compilerSupplier");
const {
  Docker,
  Native,
  Local,
  VersionRange
} = require("../../compilerSupplier/loadingStrategies");
let supplier, config;

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
        supplier = new CompilerSupplier();
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
        sinon.stub(VersionRange.prototype, "versionIsCached").returns(false);
      });
      afterEach(() => {
        VersionRange.prototype.versionIsCached.restore();
      });

      it("Uses the user specified url", done => {
        // This doesn't really verify that user provided list is being used but this in combination with next test does.
        // I am not sure what's the best way to check if user specified list is being used.
        config = {
          version: "0.4.11",
          compilerRoots: [
            "https://f00dbabe",
            "https://ethereum.github.io/solc-bin/bin/"
          ]
        };
        supplier = new CompilerSupplier(config);
        supplier
          .load()
          .then(() => {
            assert(true);
            done();
          })
          .catch(() => {
            assert(false);
            done();
          });
      });

      it("throws an error on incorrect user url", done => {
        config = { version: "0.4.12", compilerRoots: ["https://f00dbabe"] };
        supplier = new CompilerSupplier(config);
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
});
