const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const Server = require("../server");
const path = require("path");
const sandbox = require("../sandbox");
const fs = require("fs-extra");

describe("Genesis time config for truffle test, passing tests [ @standalone ]", function () {
  const logger = new MemoryLogger();
  let config;

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  describe("test with valid date", function () {
    before(async function () {
      this.timeout(10000);
      let project = path.join(
        __dirname,
        "../../sources/genesis_time/genesis_time_valid"
      );
      config = await sandbox.create(project);
      config.network = "test";
      config.logger = logger;
      // create test dir
      await fs.ensureDir(config.test_directory);
    });

    it("runs test and won't error", async function () {
      this.timeout(90000);
      await CommandRunner.run("test", config);
    });
  });
});
