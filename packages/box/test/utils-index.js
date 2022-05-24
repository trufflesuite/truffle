const assert = require("assert");
const utils = require("../dist/lib/utils");
const sinon = require("sinon");
const tmp = require("tmp");

describe("utils", () => {
  it("setUpBox rejects when passed an invalid boxConfig", () => {
    let boxConfig = {};

    assert.rejects(() => {
      utils.setUpBox(boxConfig);
    }, "should have rejected!");
  });

  it("setUpTempDirectory throws when tmpDir creation fails", () => {
    sinon.stub(tmp, "dirSync").throws();
    assert.throws(() => {
      utils.setUpTempDirectory();
    }, "should have thrown!");
    tmp.dirSync.restore();
  });
});
