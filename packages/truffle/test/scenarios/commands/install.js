const CommandRunner = require("../commandrunner");
const sandbox = require("../sandbox");
const assert = require("assert");
const fse = require("fs-extra");
const path = require("path");
let config;

describe("truffle install [ @standalone ]", () => {
  before(async () => {
    config = await sandbox.create(
      path.join(__dirname, "../../sources/install/init")
    );
    config.logger = { log: () => {} };
  });

  it("unboxes successfully", async () => {
    await CommandRunner.run("install zeppelin", config);
    const theInstallDirExists = fse.pathExistsSync(
      path.join(config.working_directory, "installed_contracts")
    );
    assert(theInstallDirExists);
  }).timeout(30000);
});
