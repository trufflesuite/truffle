const assert = require("assert");
const utils = require("../lib/utils/unbox");

describe("utils", () => {
  describe("installBoxDependencies", () => {
    it("promise resolves properly if 'post-unpack' key passed w/ empty string value", () => {
    let boxConfig = { hooks: { "post-unpack": "" } }
      utils.installBoxDependencies(boxConfig)
      .then(() => assert(true))
      .catch(() => assert(false, "threw an error!"))
    })

    it("promise rejects if 'post-unpack' key passed unexecutable value", () => {
    let boxConfig = { hooks: { "post-unpack": "doBadStuff" } }
      utils.installBoxDependencies(boxConfig)
      .then(() => assert(false, "should have thrown!"))
      .catch(({ stack }) => assert(stack.includes("Error")))
    })
  });
  describe("fetchRepository", () => {
    it("throw when passed non-strings and non-objects", () => {
      utils.fetchRepository(false)
        .then(() => assert(false, "should have thrown!"))
        .catch(({ stack }) => assert(stack.includes("Error")))
      utils.fetchRepository(123214)
        .then(() => assert(false, "should have thrown!"))
        .catch(({ stack }) => assert(stack.includes("Error")))
    });
  });
});
