const assert = require("assert");
const utils = require("../lib/utils");
const sinon = require("sinon");
const tmp = require("tmp");

describe("utils", () => {
  it("setUpBox throws when passed an invalid boxConfig", () => {
    let boxConfig = {};

    try {
      utils.setUpBox(boxConfig);
      assert(false, "didn't throw!");
    } catch (error) {
      assert(error.stack.match(/(Error:).*(post-unpack).*(undefined)/g));
    }
  });

  it("setUpTempDirectory throws when tmpDir creation fails", () => {
    sinon.stub(tmp, "dirSync").throws();
    assert.throws(() => {
      utils.setUpTempDirectory();
    }, "should have thrown!");
    tmp.dirSync.restore();
  });
});
