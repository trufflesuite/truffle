const assert = require("assert");
const sinon = require("sinon");

const { WebpackTestHelper } = require("@truffle/webpack-test-helper");
const webpackTestHelper = new WebpackTestHelper("@truffle/box");

const utils = webpackTestHelper.require("./build/utils/index.js");
const tmp = webpackTestHelper.require("tmp");

describe("utils", () => {
  it("setUpBox throws when passed an invalid boxConfig", () => {
    let boxConfig = {};

    assert.throws(() => {
      utils.setUpBox(boxConfig);
    }, "should have thrown!");
  });

  it("setUpTempDirectory throws when tmpDir creation fails", () => {
    sinon.stub(tmp, "dirSync").throws();
    assert.throws(() => {
      utils.setUpTempDirectory();
    }, "should have thrown!");
    tmp.dirSync.restore();
  });
});
