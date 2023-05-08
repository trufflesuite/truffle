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

    it("Correctly returns multiple values", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample returnPair"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "683");
      assert.include(output, "hello");
    });

    it("Accepts multiple arguments", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample sillySum 2049 hello"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "2054");
    });
  });

  describe("Overload resolution", function () {
    it("Resolves overload by argument count", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample overloaded 11 22"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "got multiple!");
    });

    it("Resolves overload by type (uint)", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample overloaded 1234"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "got uint!");
    });

    it("Resolves overload by type (address)", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: [
          "migrate",
          "call Sample overloaded 0x0000000000000000000000000000000000000000"
        ],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "got address!");
    });
  });

  describe("Revert cases", function () {
    it("Handles reverts", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample reverts"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "Error");
      assert.include(output, "Oops!");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts"); //future-proofing :)
    });

    it("Handles panics", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample panics"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "Panic");
      assert.include(output, "by zero");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts");
    });

    it("Handles custom errors", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample throws"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "MyError");
      assert.include(output, "107");
      assert.include(output, "goodbye");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts");
    });
  });

  describe("Error cases", function () {
    it("Nonexistent function name", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample decrement 56"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "Error");
      assert.include(output, "function");
      assert.include(output, "name");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts");
    });

    it("Incorrect function signature", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample increment(uint8) 56"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "Error");
      assert.include(output, "function");
      assert.include(output, "signature");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts");
    });

    it("Incorrect contract name", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Simple increment 56"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "Error");
      assert.include(output, "contract");
      assert.include(output, "name");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts");
    });

    it("Incorrect arguments", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample increment fifty-six"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "Error");
      assert.include(output, "Reason:");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts");
    });

    it("No matching overload", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample overloaded foggabogga"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "Error");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts");
    });

    it("No unique best overload", async function () {
      this.timeout(90000);
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample confusing 1"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      assert.include(output, "Error");
      assert.notInclude(output, ".js"); //user should not get a stacktrace!
      assert.notInclude(output, ".ts");
    });
  });
});
