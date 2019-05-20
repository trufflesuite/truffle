const { assert } = require("chai");
const CommandRunner = require("../commandrunner");
const sandbox = require("../sandbox");
const Server = require("../server");
const path = require("path");

describe("truffle deploy (alias for migrate)", () => {
  let config, projectPath;

  before("before all setup", async () => {
    await Server.start();
    projectPath = path.join(__dirname, "../../sources/migrations/init");
    config = await sandbox.create(projectPath);
    config.logger = { log: () => {} };
  });
  after(async () => await Server.stop());

  describe("when run on the most basic truffle project", () => {
    it("doesn't throw", done => {
      CommandRunner.run("deploy", config, error => {
        assert(error === undefined, "error should be undefined here");
        done();
      });
    }).timeout(20000);
  });
});
