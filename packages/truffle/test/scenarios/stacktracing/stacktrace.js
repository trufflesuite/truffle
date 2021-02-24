const Box = require("@truffle/box");
const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const fs = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");

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
  let options;
  const logger = new MemoryLogger();

  before("set up sandbox", async function () {
    options = { name: "bare-box", force: true };
    config = await Box.sandbox(options);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };
    await fs.ensureDir(config.test_directory);
    await fs.ensureDir(config.contracts_directory);
    await fs.ensureDir(config.migrations_directory);
    const fileName = "StacktraceTest.sol";
    //add our own contract to the contracts
    await fs.copy(
      path.join(__dirname, fileName),
      path.join(config.contracts_directory, fileName)
    );
    //add our own test to the tests
    const testFileName = "stacktrace-test.js";
    await fs.writeFile(path.join(config.test_directory, testFileName), TEST);
    //...and add a migration
    const migrationFileName = "2_deploy_contracts.js";
    await fs.writeFile(
      path.join(config.migrations_directory, migrationFileName),
      MIGRATION
    );
  });

  before(function (done) {
    Server.start(done);
  });
  after(function (done) {
    Server.stop(done);
  });

  it("will run tests and produce stack traces", async function () {
    this.timeout(70000);
    try {
      await CommandRunner.run("test --stacktrace", config);
      assert.fail("Test should have failed");
    } catch (_) {
      //tests should fail, so non-zero exit code
      var output = logger.contents();

      assert(output.includes("1 failing"));
      assert(output.includes("Oops!"));
      assert(output.includes("StacktraceTest.run1"));
      assert(output.includes("StacktraceTest.run2"));
      assert(output.includes("StacktraceTest.run3"));
    }
  });
});
