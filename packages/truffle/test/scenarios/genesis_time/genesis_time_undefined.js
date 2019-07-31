const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const assert = require("assert");
const Reporter = require("../reporter");
const Server = require("../server");
var path = require("path");
var sandbox = require("../sandbox");
const fs = require("fs-extra");

describe("Genesis time config for truffle test, option undefined", function() {
  const logger = new MemoryLogger();
  let config;

  function processErr(err, output) {
    if (err) {
      console.log(output);
      throw new Error(err);
    }
  }

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  describe("test with undefined option", function() {
    before("set up sandbox", function() {
      this.timeout(10000);
      let project = path.join(
        __dirname,
        "../../sources/genesis_time/genesis_time_undefined"
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

    it("will run test and not whine about invalid date", function(done) {
      this.timeout(90000);
      CommandRunner.run("test", config, function(err) {
        const output = logger.contents();
        processErr(err, output);
        assert(!output.includes("Invalid Date passed to genesis-time"));
        done();
      });
    });
  });
});
