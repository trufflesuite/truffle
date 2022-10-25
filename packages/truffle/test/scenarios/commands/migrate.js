const CommandRunner = require("../commandRunner");
const Server = require("../server");
const sandbox = require("../sandbox");
const path = require("path");
const { assert } = require("chai");

describe("truffle migrate", () => {
  let config, projectPath, cleanupSandboxDir;

  before(async function () {
    projectPath = path.join(__dirname, "../../sources/migrations/init");
    ({ config, cleanupSandboxDir } = await sandbox.create(projectPath));
    config.network = "development";
    config.logger = {
      log: function (stuffToLog) {
        this.loggedStuff = this.loggedStuff + stuffToLog;
      },
      loggedStuff: ""
    };
    await Server.start();
  });
  after(async function () {
    await Server.stop();
    cleanupSandboxDir();
  });

  describe("when run on the most basic truffle project", () => {
    it("doesn't throw", async () => {
      try {
        await CommandRunner.run("migrate", config);
      } catch (error) {
        console.log("the logger contents -- %o", config.logger.loggedStuff);
        console.log("the following error occurred -- %o", error.message);
        assert.fail();
      }
    }).timeout(20000);
  });
});
