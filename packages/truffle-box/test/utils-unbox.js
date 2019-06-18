const assert = require("assert");
const utils = require("../lib/utils/unbox");

describe("utils", () => {
  describe("installBoxDependencies", () => {
    it("promise resolves properly if 'post-unpack' key passed w/ empty string value", () => {
      let boxConfig = { hooks: { "post-unpack": "" } };

      try {
        utils.installBoxDependencies(boxConfig);
        assert(true);
      } catch (error) {
        assert(false, "threw an error!");
      }
    });

    it("promise rejects and exec fails if 'post-unpack' key passed unexecutable value", () => {
      let boxConfig = { hooks: { "post-unpack": "doBadStuff" } };

      try {
        utils.installBoxDependencies(boxConfig);
        assert(false, "should have thrown!");
      } catch ({ stack }) {
        assert(stack.includes("Error: Command failed"));
      }
    });
  });

  describe("fetchRepository", () => {
    it("throw when passed non-strings and non-objects", () => {
      utils
        .fetchRepository(false)
        .then(() => assert(false, "should have thrown!"))
        .catch(({ stack }) => assert(stack.includes("Invalid parameter type")));
      utils
        .fetchRepository(123214)
        .then(() => assert(false, "should have thrown!"))
        .catch(({ stack }) => assert(stack.includes("Invalid parameter type")));
    });
  });
});
