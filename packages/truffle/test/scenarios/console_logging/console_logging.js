const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

const log = console.log;

function processErr(err, output) {
  if (err) {
    log(output);
    throw new Error(err);
  }
}

describe("Testing with --console-log", () => {
  let config;
  const project = path.join(__dirname, "../../sources/console_logging");
  const logger = new MemoryLogger();

  before(async function() {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };

    new Web3.providers.HttpProvider("http://localhost:8545", {
      keepAlive: false
    });
  });

  it("successfully logs output when importing and using truffle/Console.sol", function(done) {
    this.timeout(70000);

    CommandRunner.run("test --console-log", config, err => {
      const output = logger.contents();
      processErr(err, output);

      assert(output.includes("Contract: LogTest"));
      assert(output.includes("No. of detected _TruffleLog events:  6"));
      done();
    });
  });

  it("throws if --console-log flag is omitted", function(done) {
    this.timeout(70000);

    CommandRunner.run("test", config, _err => {
      const output = logger.contents();

      assert(output.includes("Error: while migrating MyDapp"));
      assert(output.includes("MyDapp contains unresolved libraries."));
      done();
    });
  });
});
