const CommandRunner = require("../commandRunner");
const sandbox = require("../sandbox");
const Server = require("../server");
const path = require("path");
const assert = require("assert");

describe("truffle deploy (alias for migrate)", () => {
  let config, projectPath;

  before(async function () {
    projectPath = path.join(__dirname, "../../sources/migrations/init");
    config = await sandbox.create(projectPath);
    config.network = "development";
    config.logger = {
      loggedStuff: "",
      log: function (stuffToLog) {
        this.loggedStuff = this.loggedStuff + stuffToLog;
      }
    };
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  describe("when run on the most basic truffle project", () => {
    it("doesn't throw", async () => {
      try {
        await CommandRunner.run("deploy", config);
      } catch (error) {
        console.log(
          "the following was logged -- %o",
          config.logger.loggedStuff
        );
        assert.fail(error);
      }
    }).timeout(20000);
  });
});
