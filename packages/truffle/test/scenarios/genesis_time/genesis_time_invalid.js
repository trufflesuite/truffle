const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const assert = require("assert");
const Reporter = require("../reporter");
const Server = require("../server");
const path = require("path");
const sandbox = require("../sandbox");
const fs = require("fs-extra");

describe("Genesis time config for truffle test, failing tests [ @standalone ]", function () {
  const logger = new MemoryLogger();
  let config;

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  describe("test with a bad time stamp", function () {
    before("set up sandbox", function () {
      this.timeout(10000);
      let project = path.join(
        __dirname,
        "../../sources/genesis_time/genesis_time_invalid"
      );
      return sandbox.create(project).then(conf => {
        config = conf;
        config.network = "test";
        config.logger = logger;
        config.mocha = {
          reporter: new Reporter(logger)
        };
      });
    });

    before("ensure path", async () => {
      await fs.ensureDir(config.test_directory);
    });

    it("will run test and output whines about invalid date", async function () {
      this.timeout(90000);
      await CommandRunner.run("test", config);
      const output = logger.contents();
      assert(output.includes("Invalid Date passed to genesis-time"));
    });
  });
});
