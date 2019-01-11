const assert = require("assert");
const sinon = require("sinon");
const request = require("request-promise");
const {
  LoadingStrategy
} = require("../../../compilerSupplier/loadingStrategies");
let result;

describe("LoadingStrategy", () => {
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
});
