const assert = require("assert");
const sinon = require("sinon");
const request = require("request-promise");
const {
  LoadingStrategy
} = require("../../../compilerSupplier/loadingStrategies");
let result;

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
      path: "soljson-v0.1.2+commit.d0d36e3.js",
      version: "0.1.2",
      build: "commit.d0d36e3",
      longVersion: "0.1.2+commit.d0d36e3",
      keccak256:
        "0xa70b3d4acf77a303efa93c3ddcadd55b8762c7be109fd8f259ec7d6be654f03e",
      urls: [
        "bzzr://e662d71e9b8e1b0311c129b962e678e5dd63487ad9b020ee539d7f74cd7392c9"
      ]
    }
  ],
  releases: {
    "0.5.2": "soljson-v0.5.2+commit.1df8f40c.js",
    "0.5.1": "soljson-v0.5.1+commit.c8a2cb62.js",
    "0.5.0": "soljson-v0.5.0+commit.1d4f565a.js",
    "0.4.25": "soljson-v0.4.25+commit.59dbf8f1.js",
    "0.4.24": "soljson-v0.4.24+commit.e67f0147.js",
    "0.4.23": "soljson-v0.4.23+commit.124ca40d.js",
    "0.4.22": "soljson-v0.4.22+commit.4cb486ee.js"
  },
  latestRelease: "0.5.2"
};

describe("LoadingStrategy base class", () => {
  beforeEach(() => {
    instance = new LoadingStrategy();
  });

  describe(".getSolcByUrlAndCache()", () => {
    beforeEach(() => {
      sinon
        .stub(request, "get")
        .withArgs("someUrl")
        .returns("requestReturn");
      sinon.stub(instance, "addFileToCache").withArgs("requestReturn");
      sinon
        .stub(instance, "compilerFromString")
        .withArgs("requestReturn")
        .returns("success");
    });
    afterEach(() => {
      request.get.restore();
      instance.addFileToCache.restore();
    });

    it("calls addFileToCache with the response and the file name", async () => {
      result = await instance.getSolcByUrlAndCache("someUrl", "someSolcFile");
      assert(
        instance.addFileToCache.calledWith("requestReturn", "someSolcFile")
      );
      assert(result === "success");
    });
  });

  describe(".findNewestValidVersion(version, allVersions)", () => {
    it("returns the version name of the newest valid version", () => {
      expectedResult = "0.5.2";
      assert(
        instance.findNewestValidVersion("^0.5.0", allVersions) ===
          expectedResult
      );
    });
    it("returns null when the version is invalid", () => {
      assert(instance.findNewestValidVersion("garbageInput") === null);
    });
    it("returns null when there are no valid versions", () => {
      assert(instance.findNewestValidVersion("^0.8.0", allVersions) === null);
    });
  });
});
