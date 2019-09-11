const assert = require("assert");
const fs = require("fs");
const request = require("request-promise");
const sinon = require("sinon");
const { VersionRange } = require("../../../compilerSupplier/loadingStrategies");
const instance = new VersionRange();
let fileName;
const compilerFileNames = [
  "soljson-v0.4.22+commit.124ca40d.js",
  "soljson-v0.4.23+commit.1534a40d.js",
  "soljson-v0.4.11+commit.124234rd.js"
];

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

describe("VersionRange loading strategy", () => {
  describe("async load(versionRange)", () => {
    beforeEach(() => {
      sinon.stub(instance, "getCachedSolcByVersionRange");
      sinon.stub(instance, "getSolcFromCacheOrUrl");
      sinon.stub(instance, "versionIsCached").returns(true);
      sinon.stub(request, "get").returns("response");
    });
    afterEach(() => {
      instance.getCachedSolcByVersionRange.restore();
      instance.getSolcFromCacheOrUrl.restore();
      instance.versionIsCached.restore();
      request.get.restore();
    });

    it("calls getCachedSolcByVersionRange when single solc is specified", async () => {
      await instance.load("0.5.0");
      assert(instance.getCachedSolcByVersionRange.called);
    });
    it("calls getSolcFromCacheOrUrl when a larger range is specified", async () => {
      await instance.load("^0.5.0");
      assert(instance.getSolcFromCacheOrUrl.called);
    });
  });

  describe("getSolcFromCacheOrUrl(version)", () => {
    beforeEach(() => {
      sinon.stub(instance, "getSolcVersions").returns(allVersions);
      sinon.stub(instance, "getCachedSolcByFileName");
    });
    afterEach(() => {
      instance.getSolcVersions.restore();
      instance.getCachedSolcByFileName.restore();
    });

    describe("when a version constraint is specified", () => {
      beforeEach(() => {
        sinon.stub(instance, "getSolcByUrlAndCache");
        sinon.stub(instance, "fileIsCached").returns(false);
      });
      afterEach(() => {
        instance.getSolcByUrlAndCache.restore();
        instance.fileIsCached.restore();
      });

      it("calls findNewstValidVersion to determine which version to fetch", async () => {
        await instance.getSolcFromCacheOrUrl("^0.5.0");
        assert(
          instance.getSolcByUrlAndCache.calledWith(
            "soljson-v0.5.4+commit.9549d8ff.js"
          ),
          "getSolcByUrlAndCache not called with the compiler file name"
        );
      });
    });

    describe("when the version is cached", () => {
      beforeEach(() => {
        sinon.stub(instance, "fileIsCached").returns(true);
      });
      afterEach(() => {
        instance.fileIsCached.restore();
      });

      it("calls getCachedSolcByFileName", async () => {
        await instance.getSolcFromCacheOrUrl("0.5.0");
        assert(
          instance.getCachedSolcByFileName.calledWith(
            "soljson-v0.5.0+commit.1d4f565a.js"
          )
        );
      });
    });

    describe("when the version is not cached", () => {
      beforeEach(() => {
        sinon.stub(instance, "fileIsCached").returns(false);
        sinon.stub(instance, "compilerFromString").returns("compiler");
        sinon.stub(instance, "addFileToCache");
      });
      afterEach(() => {
        instance.fileIsCached.restore();
        instance.compilerFromString.restore();
        instance.addFileToCache.restore();
      });

      it("eventually calls addFileToCache and compilerFromString", async () => {
        await instance.getSolcFromCacheOrUrl("0.5.1");
        assert(instance.addFileToCache.called);
        assert(instance.compilerFromString.called);
      });
    });
  });

  describe("async getSolcByCommit(commit)", () => {
    describe("when the file is cached", () => {
      beforeEach(() => {
        sinon
          .stub(instance, "getCachedSolcFileName")
          .withArgs("commit.porkBelly")
          .returns("someFile.js");
        sinon.stub(instance, "getCachedSolcByFileName");
      });
      afterEach(() => {
        instance.getCachedSolcFileName.restore();
        instance.getCachedSolcByFileName.restore();
      });

      it("calls getCachedSolcByFileName with the file name", async () => {
        await instance.getSolcByCommit("commit.porkBelly");
        assert(instance.getCachedSolcByFileName.calledWith("someFile.js"));
      });
    });

    describe("when the file is not cached", () => {
      beforeEach(() => {
        // commit string for v 0.5.1
        commitString = "commit.c8a2cb62";
        sinon
          .stub(instance, "getCachedSolcFileName")
          .withArgs(commitString)
          .returns(undefined);
        sinon.stub(request, "get").returns("requestResponse");
        sinon.stub(instance, "addFileToCache");
        sinon.stub(instance, "compilerFromString");
        expectedUrl =
          instance.config.compilerRoots[0] +
          "soljson-v0.5.1+commit.c8a2cb62.js";
      });
      afterEach(() => {
        instance.getCachedSolcFileName.restore();
        request.get.restore();
        instance.addFileToCache.restore();
        instance.compilerFromString.restore();
      });

      it("eventually calls compilerFromString with request reponse", async () => {
        await instance.getSolcByCommit(commitString);
        assert(instance.compilerFromString.calledWith("requestResponse"));
      });
      it("throws an error when it can't find a match", async () => {
        try {
          await instance.getSolcByCommit("some garbage that will not match");
          assert(false);
        } catch (error) {
          assert(error.message === "No matching version found");
        }
      });
    });
  });

  describe(".getSolcByUrlAndCache(fileName)", () => {
    beforeEach(() => {
      fileName = "someSolcFile";
      sinon
        .stub(request, "get")
        .withArgs(`${instance.config.compilerRoots[0]}${fileName}`)
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
      instance.compilerFromString.restore();
    });

    it("calls addFileToCache with the response and the file name", async () => {
      result = await instance.getSolcByUrlAndCache(fileName, 0);
      assert(
        instance.addFileToCache.calledWith("requestReturn", "someSolcFile")
      );
      assert(result === "success");
    });
  });

  describe(".findNewestValidVersion(version, allVersions)", () => {
    it("returns the version name of the newest valid version", () => {
      expectedResult = "0.5.4";
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
