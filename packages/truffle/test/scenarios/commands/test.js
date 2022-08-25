const sandbox = require("../sandbox");
const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const { assert } = require("chai");
const Server = require("../server");

describe("truffle test", function () {
  let config;
  const logger = new MemoryLogger();
  const project = path.join(__dirname, "../../sources/toyProject");

  before(async () => {
    await Server.start();
    config = await sandbox.create(project);
    config.logger = logger;
  });
  after(async function () {
    await Server.stop();
  });

  it("runs tests", async function () {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.includes("1 passing"));
  });

  it("Test with only files specified where one or more file is missing.", async function () {
    this.timeout(70000);
    await CommandRunner.run("test not-existing.js not-existing.js", config);
    const output = logger.contents();
    assert(
      output.includes(
        "One or more of your specified files/directories don't exist."
      )
    );
  });

  it("Test with only directories specified where one or more directories are missing.", async function () {
    this.timeout(70000);
    await CommandRunner.run("test not-existing", config);
    const output = logger.contents();
    assert(
      output.includes(
        "One or more of your specified files/directories don't exist."
      )
    );
  });

  it("Test with files and directories specified where files and directories are missing.", async function () {
    this.timeout(70000);
    await CommandRunner.run(
      "test not-existing not-existing.js not-existing.sol",
      config
    );
    const output = logger.contents();
    assert(
      output.includes(
        "One or more of your specified files/directories don't exist."
      )
    );
  });

  it("Test with only directories specified where one or more directory is empty.", async function () {
    this.timeout(70000);
    await CommandRunner.run(
      "test not-existing not-existing.js not-existing.sol",
      config
    );
    const output = logger.contents();
    assert(
      output.includes("One or more of your specified directories are empty.")
    );
  });

  it("Test with only files specified, where one or more file is missing.", async function () {
    this.timeout(70000);
    await CommandRunner.run(
      "test not-existing not-existing.js not-existing.sol",
      config
    );
    const output = logger.contents();
    assert(
      output.includes("One or more of your specified directories are empty.")
    );
  });
});
