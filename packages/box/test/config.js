const boxConfig = require("../lib/config");
const assert = require("assert");

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
