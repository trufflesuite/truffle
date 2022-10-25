const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const assert = require("assert");
const Server = require("../server");
const path = require("path");
const sandbox = require("../sandbox");
const fs = require("fs-extra");

describe("Genesis time config for truffle test, option undefined [ @standalone ]", function () {
  const logger = new MemoryLogger();
  let config, cleanupSandboxDir;

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  describe("test with undefined option", function () {
    before(async function () {
      this.timeout(10000);
      let project = path.join(
        __dirname,
        "../../sources/genesis_time/genesis_time_undefined"
      );
      ({ config, cleanupSandboxDir } = await sandbox.create(project));
      config.network = "test";
      config.logger = logger;
      // create test dir
      await fs.ensureDir(config.test_directory);
    });
    after(function () {
      cleanupSandboxDir();
    });

    it("runs test and doesn't whine about invalid date", async function () {
      this.timeout(90000);
      await CommandRunner.run("test", config);
      const output = logger.contents();
      assert(!output.includes("Invalid Date passed to genesis-time"));
    });
  });
});
