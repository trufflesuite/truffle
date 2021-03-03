const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

describe("testing with solidity logging", () => {
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
    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.includes("here is my boolean --"));
    assert(output.includes("true"));
    assert(output.includes("here is my integer --"));
    assert(output.includes("-4321"));
    assert(output.includes("here is my uint --"));
    assert(output.includes("1234"));
    assert(output.includes("here is my string --"));
    assert(output.includes("myString"));
    assert(output.includes("here is my bytes32 --"));
    assert(
      output.includes(
        "0x6d79427974657333320000000000000000000000000000000000000000000000"
      )
    );
    assert(output.includes("here is my address --"));
  }).timeout(40000);
});
