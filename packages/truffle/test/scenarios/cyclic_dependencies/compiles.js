var Box = require("truffle-box");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var fs = require("fs-extra");
var path = require("path");
var assert = require("assert");
var Ganache = require("ganache-core");
var Reporter = require("../reporter");

describe("Cyclic Dependencies", function() {
  var config;
  var logger = new MemoryLogger();

  before("set up sandbox", function(done) {
    this.timeout(10000);
    Box.sandbox("default", function(err, conf) {
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
