const Box = require("truffle-box");
const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const fs = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Ganache = require("ganache-core");
const Reporter = require("../reporter");

describe("Cyclic Dependencies", function() {
  let config;
  let options;
  const logger = new MemoryLogger();

  before("set up sandbox", function(done) {
    this.timeout(10000);
    options = { name: "default", force: true };
    Box.sandbox(options, (err, conf) => {
      if (err) return done(err);
      config = conf;
      config.logger = logger;
      config.networks.development.provider = Ganache.provider({
        gasLimit: config.gas
      });
      config.mocha = {
        reporter: new Reporter(logger)
      };
      done();
    });
  });

  before("add files with cyclic dependencies", function() {
    fs.copySync(
      path.join(__dirname, "Ping.sol"),
      path.join(config.contracts_directory, "Ping.sol")
    );
    fs.copySync(
      path.join(__dirname, "Pong.sol"),
      path.join(config.contracts_directory, "Pong.sol")
    );
  });

  it("will compile cyclic dependencies that Solidity is fine with (no `new`'s)", function(done) {
    this.timeout(20000);

    CommandRunner.run("compile", config, function(err) {
      if (err) return done(err);

      // If it gets this far, it worked. The compiler shouldn't throw an error.
      // Lets check artifacts are there though.

      assert(
        fs.existsSync(path.join(config.contracts_build_directory, "Ping.json"))
      );
      assert(
        fs.existsSync(path.join(config.contracts_build_directory, "Pong.json"))
      );

      done();
    });
  });
});
