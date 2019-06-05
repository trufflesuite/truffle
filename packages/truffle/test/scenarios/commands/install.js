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

  it("unboxes successfully", done => {
    CommandRunner.run("install zeppelin", config, error => {
      if (error) {
        console.log("%o", error);
        assert(false, "An error occured while installing");
      }

      const theInstallDirExists = fse.pathExistsSync(
        path.join(config.working_directory, "installed_contracts")
      );
      assert(theInstallDirExists);
      done();
    });
  }).timeout(20000);
});
