const Box = require("@truffle/box");
const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const fs = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");

describe("Solidity Tests", function() {
  const logger = new MemoryLogger();
  let config;
  let options;

  /**
   * Installs a bare truffle project and deposits a solidity test target
   * in the test directory.
   * @param  {Function} done callback
   * @param  {String}   file Solidity test target
   */
  async function initSandbox(file) {
    options = { name: "bare", force: true };
    config = await Box.sandbox(options);
    config.logger = logger;
    config.network = "development";
    config.mocha = {
      reporter: new Reporter(logger)
    };
    const from = path.join(__dirname, file);

    await fs.ensureDir(config.test_directory);
    await fs.copy(from, config.test_directory + `/${file}`);
  }

  function processErr(err, output) {
    if (err) {
      console.log(output);
      throw new Error(err);
    }
  }

  before(done => Server.start(done));
  after(done => Server.stop(done));

  describe("test with balance", function() {
    before(async () => {
      await initSandbox("TestWithBalance.sol");
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
  }).timeout(5000);

  describe("tests failing", function() {
    before(async () => {
      await initSandbox("TestFailures.sol");
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
  }).timeout(5000);
});
