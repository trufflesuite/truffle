const CommandRunner = require("../commandRunner");
const Server = require("../server");
const MemoryLogger = require("../MemoryLogger");
const { assert } = require("chai");
const path = require("path");
const sandbox = require("../sandbox");

describe("truffle call", function () {
  let config, cleanupSandboxDir;
  const logger = new MemoryLogger();
  const project = path.join(__dirname, "../../sources/call");

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
    cleanupSandboxDir();
  });

  beforeEach(async function () {
    ({ config, cleanupSandboxDir } = await sandbox.create(project));
    config.network = "development";
    config.logger = logger;
  });

  describe("Basic success cases", function () {
    it("Correctly returns an integer value", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample increment 567"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "568");
    });

    it("Accepts function signatures", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample increment(uint256) 567"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "568");
    });
  });
});
