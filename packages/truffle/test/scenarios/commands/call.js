const CommandRunner = require("../commandRunner");
const Server = require("../server");
const MemoryLogger = require("../MemoryLogger");
const { assert } = require("chai");
const path = require("path");
const sandbox = require("../sandbox");

describe("truffle call", () => {
  let config, cleanupSandboxDir;
  const logger = new MemoryLogger();
  const project = path.join(__dirname, "../../sources/call");

  before(async () => await Server.start());
  after(async () => {
    await Server.stop();
    cleanupSandboxDir();
  });

  beforeEach(async () => {
    ({ config, cleanupSandboxDir } = await sandbox.create(project));
    config.network = "development";
    config.logger = logger;
  });

  describe("when runs with basic contract", () => {
    it("returns the set value of the variable in the contract", async () => {
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: [
          "migrate",
          "const s = await Sample.deployed()",
          "s.setValue(100)",
          "call Sample getValue"
        ],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      const expectedValue = "100";
      assert.include(output, expectedValue, `Output includes ${expectedValue}`);
    }).timeout(90000);

    it("correctly resolves overloads", async () => {
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: [
          "migrate",
          "const s = await Sample.deployed()",
          "s.setValue(200)",
          "call Sample getValue 10"
        ],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      const expectedValue = "210";
      assert.include(output, expectedValue, `Output includes ${expectedValue}`);
    }).timeout(90000);

    it("correctly resolves full function ABI signature", async () => {
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: [
          "migrate",
          "const s = await Sample.deployed()",
          "s.setValue(300)",
          "call Sample getValue(uint256) 10"
        ],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      const expectedValue = "310";
      assert.include(output, expectedValue, `Output includes ${expectedValue}`);
    }).timeout(90000);

    it("returns multiple values of different types", async () => {
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample getMultipleValues"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      const expectedValue = "truffle" && 20;
      assert.include(output, expectedValue, `Output includes ${expectedValue}`);
    }).timeout(90000);

    it("throws error on entering invalid input", async () => {
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: [
          "migrate",
          "const s = await Sample.deployed()",
          "s.setValue(100)",
          "call Sample getValue 10 20"
        ],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      const expectedError =
        "The function name, function signature or function arguments you entered are invalid!\n" +
        "Please run the command again with valid function name, function signature and function arguments (if any)!";
      assert.include(output, expectedError, `Output includes ${expectedError}`);
    }).timeout(90000);

    it("returns a revert message", async () => {
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample getRevertMessage"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      const expectedValue = "You are a failure";
      assert.include(output, expectedValue, `Output includes ${expectedValue}`);
    }).timeout(90000);

    it("correctly resolves returned panic code", async () => {
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: ["migrate", "call Sample getPanicMessage"],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });
      const output = logger.contents();
      const expectedValue = "Panic: Failed assertion";
      assert.include(output, expectedValue, `Output includes ${expectedValue}`);
    }).timeout(90000);
  });
});
