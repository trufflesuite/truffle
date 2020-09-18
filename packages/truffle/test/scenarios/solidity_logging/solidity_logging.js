const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

describe("Testing with --solidity-logging", () => {
  let config;
  const project = path.join(__dirname, "../../sources/console_logging");
  const logger = new MemoryLogger();

  before(async () => {
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };

    new Web3.providers.HttpProvider("http://localhost:8545", {
      keepAlive: false
    });
  });

  it("successfully logs output when importing and using truffle/Console.sol", async () => {
    await CommandRunner.run("test --solidity-logging", config);
    const output = logger.contents();
    assert(output.includes("Contract: LogTest"));
    assert(output.includes("No. of detected _TruffleConsoleLog events:  6"));
  }).timeout(20000);

  it("throws if --solidity-logging flag is omitted", async () => {
    try {
      await CommandRunner.run("test", config);
      assert.fail();
    } catch (error) {
      const output = logger.contents();
      assert(output.includes("Error: while migrating MyDapp"));
      assert(output.includes("MyDapp contains unresolved libraries."));
    }
  }).timeout(20000);
});
