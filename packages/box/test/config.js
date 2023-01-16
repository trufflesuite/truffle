const assert = require("assert");
const { WebpackTestHelper } = require("@truffle/webpack-test-helper");
const webpackTestHelper = new WebpackTestHelper("@truffle/box");

const boxConfig = webpackTestHelper.require("./build/config.js");

describe("boxConfig", () => {
  it(".setDefaults sets truffle-box.json defaults if config settings unspecified", done => {
    const configDefaults = boxConfig.setDefaults();
    assert(configDefaults);
    assert(configDefaults.ignore);
    assert(configDefaults.commands);
    assert(configDefaults.hooks);
    done();
  });
  it(".read reads a filepath and returns config defaults", done => {
    boxConfig.read("test").then(config => {
      assert(config);
      assert(config.ignore);
      assert(config.commands);
      assert(config.hooks);
    });
    done();
  });
});
