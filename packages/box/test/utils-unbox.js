const assert = require("assert");
const utils = require("../dist/utils/unbox");
const axios = require("axios");
const sinon = require("sinon");

describe("utils", () => {
  describe("installBoxDependencies", () => {
    it("returns properly if 'post-unpack' key passed w/ empty string value", () => {
      let boxConfig = { hooks: { "post-unpack": "" } };

      assert.doesNotThrow(() => {
        utils.installBoxDependencies(boxConfig);
      }, "should not throw!");
    });

    it("throws if 'post-unpack' key passed unexecutable value", () => {
      let boxConfig = { hooks: { "post-unpack": "doBadStuff" } };

      assert.throws(() => {
        utils.installBoxDependencies(boxConfig);
      }, "should have thrown!");
    });
  });

  describe("fetchRepository", () => {
    it("rejects when passed non-strings and non-objects", async () => {
      await assert.rejects(async () => {
        await utils.fetchRepository(false);
      }, "should have rejected!");

      await assert.rejects(async () => {
        await utils.fetchRepository(123214);
      }, "should have rejected!");
    });
  });

  describe("verifySourcePath", async () => {
    const errorStatus = 401;
    const errorMessage = "Network error: oh noes!";
    const authError = {
      response: {
        status: errorStatus
      },
      message: errorMessage
    };
    let url;

    before(async () => {
      url = "https://github.com/truffle-box/bare-box";
      sinon.stub(axios, "head").throws(authError);
    });

    it("Includes network error message on non 404 failure", async () => {
      try {
        await utils.verifyVCSURL(url);
        assert(false, "verifyVCSURL should have thrown!");
      } catch (error) {
        const { response, message } = error;
        assert.equal(response.status, errorStatus);
        assert(
          message.endsWith(errorMessage),
          "Axios error message should be the suffix"
        );
      }
    });
  });
});
