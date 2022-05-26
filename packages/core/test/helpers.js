const Config = require("@truffle/config");
const tmp = require("tmp");
const fse = require("fs-extra");

const createTestProject = sourcePath => {
  const tempDir = tmp.dirSync({ unsafeCleanup: true });
  fse.copySync(sourcePath, tempDir.name);
  return new Config(undefined, tempDir.name);
};

module.exports = {
  createTestProject
};
