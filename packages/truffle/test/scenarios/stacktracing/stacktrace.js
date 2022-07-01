const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const fse = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");

const TEST = `
const StacktraceTest = artifacts.require("StacktraceTest");

contract("StacktraceTest", function(accounts) {
  it("fails", async function() {
    let instance = await StacktraceTest.deployed();
    await instance.run();
  });
});
`;

const MIGRATION = `
const StacktraceTest = artifacts.require("StacktraceTest");

module.exports = function(deployer) {
  deployer.deploy(StacktraceTest);
}
`;

describe("Stack tracing", function () {
  let config;
  const logger = new MemoryLogger();

  before(async function () {
    config = await sandbox.create(path.join(__dirname, "../../sources/init"));
    config.network = "development";
    config.logger = logger;
    await fse.ensureDir(config.test_directory);
    await fse.ensureDir(config.contracts_directory);
    await fse.ensureDir(config.migrations_directory);
    const fileName = "StacktraceTest.sol";
    //add our own contract to the contracts
    await fse.copy(
      path.join(__dirname, fileName),
      path.join(config.contracts_directory, fileName)
    );
    //add our own test to the tests
    const testFileName = "stacktrace-test.js";
    await fse.writeFile(path.join(config.test_directory, testFileName), TEST);
    //...and add a migration
    const migrationFileName = "2_deploy_contracts.js";
    await fse.writeFile(
      path.join(config.migrations_directory, migrationFileName),
      MIGRATION
    );
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  it("runs tests and produces stacktraces", async function () {
    this.timeout(70000);
    try {
      await CommandRunner.run("test --stacktrace", config);
      assert.fail("Test should have failed");
    } catch (_) {
      //tests should fail, so non-zero exit code
      const output = logger.contents();

      assert(output.includes("1 failing"));
      assert(output.includes("Oops!"));
      assert(output.includes("StacktraceTest.run1"));
      assert(output.includes("StacktraceTest.run2"));
      assert(output.includes("StacktraceTest.run3"));
    }
  });
});
