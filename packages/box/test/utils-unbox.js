const assert = require("assert");
const utils = require("../lib/utils/unbox");

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
    it("rejects when passed non-strings and non-objects", () => {
      assert.rejects(async () => {
        await utils.fetchRepository(false);
      }, "should have rejected!");

      assert.rejects(async () => {
        await utils.fetchRepository(123214);
      }, "should have rejected!");
    });
  });
});
