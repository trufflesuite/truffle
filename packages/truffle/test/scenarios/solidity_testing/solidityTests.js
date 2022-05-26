const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const fs = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");

describe("Solidity Tests", function () {
  const logger = new MemoryLogger();
  let config;

  /**
   * Installs a bare truffle project and deposits a solidity test target
   * in the test directory.
   * @param  {Function} done callback
   * @param  {String}   file Solidity test target
   */
  async function initSandbox(file) {
    config = await sandbox.create(path.join(__dirname, "../../sources/init"));
    config.logger = logger;
    config.network = "development";
    config.mocha = {
      reporter: new Reporter(logger)
    };
    const from = path.join(__dirname, file);

    await fs.ensureDir(config.test_directory);
    await fs.copy(from, config.test_directory + `/${file}`);
  }

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  describe("test with balance", function () {
    before(async () => {
      await initSandbox("TestWithBalance.sol");
    });

    it("runs the tests and has the correct balance", function () {
      this.timeout(100000);

      return CommandRunner.run("test", config)
        .then(() => {
          const output = logger.contents();
          assert(output.includes("1 passing"));
        })
        .catch(error => {
          assert(false, `An error occurred: ${error}`);
        });
    });
  });

  describe("tests failing", function () {
    before(async () => {
      await initSandbox("TestFailures.sol");
    });

    it("throws errors correctly", function () {
      this.timeout(100000);

      return CommandRunner.run("test", config)
        .then(() => {
          assert(false, "The tests should have failed.");
        })
        .catch(error => {
          const output = logger.contents();
          assert(error);
          assert(output.includes("2 failing"));
        });
    });
  });

  describe("compatibility", function () {
    before(async () => {
      await initSandbox("ImportEverything.sol");
    });

    it("compiles with latest Solidity", function () {
      this.timeout(100000);

      return CommandRunner.run(
        "test",
        config.with({ solc: { version: "native" } })
      )
        .then(() => {
          const output = logger.contents();
          assert(output.includes("1 passing"));
        })
        .catch(error => {
          assert(false, `An error occurred: ${error}`);
        });
    });
  });
});
