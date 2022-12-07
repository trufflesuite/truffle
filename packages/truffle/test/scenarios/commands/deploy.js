const CommandRunner = require("../commandRunner");
const sandbox = require("../sandbox");
const Server = require("../server");
const path = require("path");
const { assert } = require("chai");

describe("truffle deploy (alias for migrate)", () => {
  let config, projectPath, cleanupSandboxDir;

  before(async function () {
    projectPath = path.join(__dirname, "../../sources/migrations/init");
    ({ config, cleanupSandboxDir } = await sandbox.create(projectPath));
    config.network = "development";
    config.logger = { log: () => {} };
    await Server.start();
  });
  after(async function () {
    await Server.stop();
    cleanupSandboxDir();
  });

  describe("when run on the most basic truffle project", () => {
    it("doesn't throw", async () => {
      await CommandRunner.run("deploy", config);
    }).timeout(20000);

    it("doesn't throw when --url option is passed", async () => {
      try {
        await CommandRunner.run("deploy --url http://127.0.0.1:8545", config);
      } catch (error) {
        console.log("the logger contents -- %o", config.logger.loggedStuff);
        console.log("the following error occurred -- %o", error.message);
        assert.fail();
      }
    }).timeout(20000);
  });
});
