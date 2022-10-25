const CommandRunner = require("../commandRunner");
const sandbox = require("../sandbox");
const Server = require("../server");
const path = require("path");

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
  });
});
