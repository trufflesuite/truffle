import * as path from "path";
import { assert } from "chai";
import { describe, it, beforeEach, afterEach } from "mocha";
import * as sinon from "sinon";
import axios from "axios";
import {
  CompilerSupplier,
  Cache,
  LoadingStrategies
} from "@truffle/compile-solidity";
const { Docker, Native, Local, VersionRange } = LoadingStrategies;
import Config from "@truffle/config";
const config = Config.default();
let supplier, supplierOptions;

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

const unStub = (stubbedThing: object, methodName: string) => {
  stubbedThing[methodName].restore();
};

let fakeReturn = {
  compile: _arg1 => "loaded",
  version: () => ""
};

describe("CompilerSupplier", () => {
  beforeEach(function () {
    supplierOptions = {
      events: config.events
    };
  });

  describe("load()", () => {
    describe("when a docker tag is specified in the config", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = {
          docker: "randoDockerTagzzz",
          version: "0.4.25"
        };
        supplier = new CompilerSupplier(supplierOptions);
        fakeReturn.version = () => "called Docker";
        sinon
          .stub(Docker.prototype, "load")
          .returns(Promise.resolve(fakeReturn));
      });
      afterEach(() => {
        unStub(Docker.prototype, "load");
      });

      it("calls load on the Docker strategy", async function () {
        const { solc } = await supplier.load();
        assert.equal(solc.version(), "called Docker");
      });
    });

    describe(`using the setting below (n'ative)`, () => {
      // HACK: Because of how the test script is set up, the word 'native' cannot be a
      // part of the it/describe strings above and below
      beforeEach(() => {
        supplierOptions.solcConfig = { version: "native" };
        supplier = new CompilerSupplier(supplierOptions);
        fakeReturn.version = () => "called Native";
        sinon.stub(Native.prototype, "load").returns(fakeReturn);
      });
      afterEach(() => {
        unStub(Native.prototype, "load");
      });

      it("calls load on the Native strategy", async function () {
        const { solc } = await supplier.load();
        assert.equal(solc.version(), "called Native");
      });
    });

    describe("when no version is specified in the config", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = { version: undefined };
        supplier = new CompilerSupplier(supplierOptions);
        fakeReturn.version = () => "called VersionRange";
        sinon
          .stub(VersionRange.prototype, "load")
          .returns(Promise.resolve(fakeReturn));
      });
      afterEach(() => {
        unStub(VersionRange.prototype, "load");
      });

      it("calls load on the VersionRange strategy", async function () {
        const { solc } = await supplier.load();
        assert.equal(solc.version(), "called VersionRange");
      });
    });

    describe("when a solc version is specified in the config", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = { version: "0.4.11" };
        supplier = new CompilerSupplier(supplierOptions);
        fakeReturn.version = () => "called VersionRange";
        sinon
          .stub(VersionRange.prototype, "load")
          .returns(Promise.resolve(fakeReturn));
      });
      afterEach(() => {
        unStub(VersionRange.prototype, "load");
      });

      it("calls load on the VersionRange strategy", async function () {
        const { solc } = await supplier.load();
        assert.equal(solc.version(), "called VersionRange");
      });
    });

    describe("when a user specifies the compiler url root", () => {
      beforeEach(() => {
        sinon.stub(Cache.prototype, "add");
        sinon.stub(Cache.prototype, "has").returns(false);
        sinon
          .stub(VersionRange.prototype, "getSolcVersionsForSource")
          .returns(Promise.resolve(allVersions));
        sinon
          .stub(VersionRange.prototype, "versionIsCached")
          .returns(undefined);
        sinon.stub(VersionRange.prototype, "compilerFromString");
        sinon
          .stub(axios, "get")
          .withArgs(
            "https://ethereum.github.io/solc-bin/bin/soljson-v0.5.1+commit.c8a2cb62.js"
          )
          .returns(Promise.resolve({ data: "response" }));
      });
      afterEach(() => {
        unStub(Cache.prototype, "add");
        unStub(Cache.prototype, "has");
        unStub(VersionRange.prototype, "getSolcVersionsForSource");
        unStub(VersionRange.prototype, "versionIsCached");
        unStub(VersionRange.prototype, "compilerFromString");
        unStub(axios, "get");
      });

      it("loads VersionRange with the user specified urls", async function () {
        this.timeout(30000);
        // This doesn't really verify that user provided list is being used but this in combination with next test does.
        // I am not sure what's the best way to check if user specified list is being used.
        supplierOptions.solcConfig = {
          version: "0.5.1",
          compilerRoots: ["https://ethereum.github.io/solc-bin/bin/"]
        };
        supplier = new CompilerSupplier(supplierOptions);
        await supplier.load();
        assert(
          // @ts-ignore
          VersionRange.prototype.compilerFromString.calledWith("response")
        );
      });

      it("throws an error on incorrect user url", async function () {
        supplierOptions.solcConfig = {
          version: "0.5.6",
          compilerRoots: ["https://f00dbabe"]
        };
        supplier = new CompilerSupplier(supplierOptions);
        try {
          await supplier.load();
          assert.fail();
        } catch (error) {
          let expectedMessageSnippet = "Failed to fetch the Solidity compiler";
          assert.include(error.message, expectedMessageSnippet);
        }
      });
    });

    describe("when a solc version range is specified", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = { version: "^0.4.11" };
        supplier = new CompilerSupplier(supplierOptions);
        fakeReturn.version = () => "called VersionRange";
        sinon
          .stub(VersionRange.prototype, "load")
          .returns(Promise.resolve(fakeReturn));
      });
      afterEach(() => {
        unStub(VersionRange.prototype, "load");
      });

      it("calls load on the VersionRange strategy", async function () {
        const { solc } = await supplier.load();
        assert.equal(solc.version(), "called VersionRange");
      });
    });

    describe("when a path is specified in the config", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = {
          version: path.resolve(__dirname, "./test/fixture/fakeCompiler")
        };
        supplier = new CompilerSupplier(supplierOptions);
        fakeReturn.version = () => "called Local";
        sinon
          .stub(Local.prototype, "load")
          .returns(Promise.resolve(fakeReturn));
      });
      afterEach(async () => {
        unStub(Local.prototype, "load");
      });

      it("calls load on the Local strategy", async function () {
        const { solc } = await supplier.load();
        assert.equal(solc.version(), "called Local");
      });
    });

    describe("when no valid values are specified", () => {
      beforeEach(() => {
        supplierOptions.solcConfig = { version: "globbity gloop" };
        supplier = new CompilerSupplier(supplierOptions);
      });

      it("throws an error", async function () {
        try {
          await supplier.load();
          assert.fail();
        } catch (error) {
          let expectedMessageSnippet = "version matching globbity gloop";
          assert.include(error.message, expectedMessageSnippet);
        }
      });
    });
  });
});
