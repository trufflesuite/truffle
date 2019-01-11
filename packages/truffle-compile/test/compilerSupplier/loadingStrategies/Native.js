const assert = require("assert");
const sinon = require("sinon");
const request = require("request-promise");
const { Native } = require("../../../compilerSupplier/loadingStrategies");
const instance = new Native();
let commitString;

describe("Native loading strategy", () => {
  describe("async getSolc(commitString)", () => {
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
        await instance.getSolc("commit.porkBelly");
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
          instance.config.compilerUrlRoot + "soljson-v0.5.1+commit.c8a2cb62.js";
      });
      afterEach(() => {
        instance.getCachedSolcFileName.restore();
        request.get.restore();
        instance.addFileToCache.restore();
        instance.compilerFromString.restore();
      });

      it("eventually calls compilerFromString with request reponse", async () => {
        await instance.getSolc(commitString);
        assert(instance.compilerFromString.calledWith("requestResponse"));
      });
      it("throws an error when it can't find a match", async () => {
        try {
          await instance.getSolc("some garbage that will not match");
          assert(false);
        } catch (error) {
          assert(error.message === "No matching version found");
        }
      });
    });
  });
});
