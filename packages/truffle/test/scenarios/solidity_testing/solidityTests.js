const Box = require("truffle-box");
const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const fs = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");

describe("Solidity Tests", function() {
  const logger = new MemoryLogger();
  let config;

  /**
   * Installs a bare truffle project and deposits a solidity test target
   * in the test directory.
   * @param  {Function} done callback
   * @param  {String}   file Solidity test target
   */
  function initSandbox(done, file) {
    Box.sandbox("bare", function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.logger = logger;
      config.network = "development";
      config.mocha = {
        reporter: new Reporter(logger)
      };
      const from = path.join(__dirname, file);

      fs.ensureDir(config.test_directory).then(() => {
        fs.copy(from, config.test_directory + `/${file}`);
        done();
      });
    });
  }

  function processErr(err, output) {
    if (err) {
      console.log(output);
      throw new Error(err);
    }
  }

  describe("test with balance", function() {
    before(function(done) {
      this.timeout(5000);
      initSandbox(done, "TestWithBalance.sol");
    });

    it("will run the test and have the correct balance", function(done) {
      this.timeout(70000);

      CommandRunner.run("test", config, function(err) {
        const output = logger.contents();
        processErr(err, output);
        assert(output.includes("1 passing"));
        done();
      });
    });
  });

  describe("tests failing", function() {
    before(function(done) {
      this.timeout(5000);
      initSandbox(done, "TestFailures.sol");
    });

    it("will throw errors correctly", function(done) {
      this.timeout(70000);

      CommandRunner.run("test", config, function(err) {
        const output = logger.contents();
        assert(err, `Tests should error. Output: ${output}`);
        assert(output.includes("2 failing"));
        done();
      });
    });
  });
});
