const tmp = require("tmp");
const fse = require("fs-extra");
const Config = require("@truffle/config");
const path = require("path");

module.exports = {
  async create(source, subPath = "") {
    if (!fse.existsSync(source)) {
      throw new Error(`Sandbox failed: source: ${source} does not exist`);
    }

    const tempDir = tmp.dirSync({ unsafeCleanup: true });
    fse.copySync(source, tempDir.name);
    const config = Config.load(
      path.join(tempDir.name, subPath, "truffle-config.js"),
      {}
    );
    return config;
  },

  async load(source) {
    if (!fse.existsSync(source)) {
      throw new Error(`Sandbox failed: source: ${source} does not exist`);
    }
    const config = Config.load(path.join(source, "truffle-config.js"), {});
    return config;
  }
};
