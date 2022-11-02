const { assert } = require("chai");
const CommandRunner = require("../commandRunner");
const Server = require("../server");
const sandbox = require("../sandbox");
const path = require("path");

describe("truffle networks", () => {
  let config, projectPath, cleanupSandboxDir;

  before(async function () {
    this.timeout(10000);
    projectPath = path.join(__dirname, "../../sources/networks/metacoin");
    ({ cleanupSandboxDir, config } = await sandbox.create(projectPath));
    config.network = "development";
    config.logger = { log: () => {} };
    await Server.start();
  });
  after(async function () {
    await Server.stop();
    cleanupSandboxDir();
  });

  describe("when run on a simple project", () => {
    it("doesn't throw", async () => {
      await CommandRunner.run("networks", config);
    }).timeout(20000);
  });

  describe("when run with --clean", () => {
    it("removes networks with id's not listed in the config", async function () {
      this.timeout(10000);
      const workingDirectory = config.working_directory;
      const pathToArtifact = path.join(
        workingDirectory,
        "build",
        "contracts",
        "MetaCoin.json"
      );
      await CommandRunner.run("networks --clean", config);
      const artifact = require(pathToArtifact);
      assert(
        Object.keys(artifact.networks).length === 1,
        "It should have deleted 1 network entry"
      );
      assert(
        artifact.networks["4"],
        "It should have kept the network info for network_id 4"
      );
    });
  });
});
