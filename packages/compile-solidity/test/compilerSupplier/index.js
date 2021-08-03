const assert = require("assert");
const sinon = require("sinon");
const axios = require("axios");
const { CompilerSupplier } = require("../../dist/compilerSupplier");
const { Cache } = require("../../dist/compilerSupplier/Cache");
const {
  Docker,
  Native,
  Local,
  VersionRange
} = require("../../dist/compilerSupplier/loadingStrategies");
const Config = require("@truffle/config");
const config = new Config();
let supplier;
const supplierOptions = { events: config.events };

const allVersions = {
  builds: [
    {
      path: "soljson-v0.1.1+commit.6ff4cd6.js",
      version: "0.1.1",
      build: "commit.6ff4cd6",
      longVersion: "0.1.1+commit.6ff4cd6",
      keccak256:
        "0xd8b8c64f4e9de41e6604e6ac30274eff5b80f831f8534f0ad85ec0aff466bb25",
      urls: [
        "bzzr://8f3c028825a1b72645f46920b67dca9432a87fc37a8940a2b2ce1dd6ddc2e29b"
      ]
    },
    {
      path: "soljson-v0.5.1+commit.c8a2cb62.js",
      version: "0.5.1",
      build: "commit.c8a2cb62",
      longVersion: "0.5.1+commit.c8a2cb62",
      keccak256:
        "0xa70b3d4acf77a303efa93c3ddcadd55b8762c7be109fd8f259ec7d6be654f03e",
      urls: [
        "bzzr://e662d71e9b8e1b0311c129b962e678e5dd63487ad9b020ee539d7f74cd7392c9"
      ]
    }
  ],
  releases: {
    "0.5.4": "soljson-v0.5.4+commit.9549d8ff.js",
    "0.5.3": "soljson-v0.5.3+commit.10d17f24.js",
    "0.5.2": "soljson-v0.5.2+commit.1df8f40c.js",
    "0.5.1": "soljson-v0.5.1+commit.c8a2cb62.js",
    "0.5.0": "soljson-v0.5.0+commit.1d4f565a.js",
    "0.4.25": "soljson-v0.4.25+commit.59dbf8f1.js",
    "0.4.24": "soljson-v0.4.24+commit.e67f0147.js",
    "0.4.23": "soljson-v0.4.23+commit.124ca40d.js",
    "0.4.22": "soljson-v0.4.22+commit.4cb486ee.js"
  },
  latestRelease: "0.5.4"
};

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

      it("calls load on the Docker strategy", async function () {
        const { solc } = await supplier.load();
        assert(solc === "called Docker");
      });
    });

    describe(`using the setting below (n'ative)`, () => {
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

      it("calls load on the Native strategy", async function() {
        const { solc } = await supplier.load();
        assert(solc === "called Native");
      });
    });

    describe("when no version is specified in the config", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = { version: undefined };
        supplier = new CompilerSupplier(supplierOptions);
        sinon.stub(VersionRange.prototype, "load")
          .returns("called VersionRange");
      });
      afterEach(() => {
        VersionRange.prototype.load.restore();
      });

      it("calls load on the VersionRange strategy", async function () {
        const { solc } = await supplier.load();
        assert(solc === "called VersionRange");
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
        sinon.stub(Cache.prototype, "addFileToCache");
        sinon.stub(Cache.prototype, "fileIsCached").returns(false);
        sinon.stub(VersionRange.prototype, "getSolcVersions")
          .returns(allVersions);
        sinon.stub(VersionRange.prototype, "versionIsCached").returns(false);
        sinon.stub(VersionRange.prototype, "compilerFromString");
        sinon.stub(axios, "get")
          .withArgs(
            "https://ethereum.github.io/solc-bin/bin/soljson-v0.5.1+commit.c8a2cb62.js"
          )
          .returns({ data: "response" });
      });
      afterEach(() => {
        Cache.prototype.addFileToCache.restore();
        Cache.prototype.fileIsCached.restore();
        VersionRange.prototype.getSolcVersions.restore();
        VersionRange.prototype.versionIsCached.restore();
        VersionRange.prototype.compilerFromString.restore();
        axios.get.restore();
      });

      it("loads VersionRange with the user specified urls", async function () {
        // This doesn't really verify that user provided list is being used but this in combination with next test does.
        // I am not sure what's the best way to check if user specified list is being used.
        supplierOptions.solcConfig = {
          version: "0.5.1",
          compilerRoots: ["https://ethereum.github.io/solc-bin/bin/"]
        };
        supplier = new CompilerSupplier(supplierOptions);
        await supplier.load();
        assert(
          VersionRange.prototype.compilerFromString.calledWith("response")
        );
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
