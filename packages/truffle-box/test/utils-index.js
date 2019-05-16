const assert = require("assert");
const utils = require("../lib/utils");
const sinon = require("sinon");
const tmp = require("tmp");

describe("utils", () => {
  it("setUpBox throws when passed an invalid boxConfig", () => {
    let boxConfig = {};

    utils
      .setUpBox(boxConfig)
      .then(() => assert(false, "didn't throw!"))
      .catch(e =>
        assert(e.stack.match(/(Error:).*(post-unpack).*(undefined)/g))
      );
  });

  it("setUpTempDirectory throws when tmpDir creation fails", () => {
    sinon.stub(tmp, "dirSync").throws();
    assert.throws(() => {
      utils.setUpTempDirectory();
    }, "should have thrown!");
    tmp.dirSync.restore();
  });
});
