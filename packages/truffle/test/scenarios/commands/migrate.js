const CommandRunner = require("../commandRunner");
const Server = require("../server");
const sandbox = require("../sandbox");
const path = require("path");

describe("truffle migrate", () => {
  let config, projectPath;

  before(async function () {
    projectPath = path.join(__dirname, "../../sources/migrations/init");
    config = await sandbox.create(projectPath);
    config.network = "development";
    config.logger = { log: () => {} };
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  describe("when run on the most basic truffle project", () => {
    it("doesn't throw", async () => {
      await CommandRunner.run("migrate", config);
    }).timeout(20000);
  });
});
