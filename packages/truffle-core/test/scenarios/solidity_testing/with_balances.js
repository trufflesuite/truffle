var Init = require("truffle-init");
var MemoryLogger = require("../memorylogger");
var Commander = require("../../../lib/command");
var commands = require("../../../lib/commands");
var copy = require("../../../lib/copy");
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var TestRPC = require("ethereumjs-testrpc");
var Reporter = require("../reporter");

describe("Solidity Tests with balances", function() {
  var logger = new MemoryLogger();
  var config;
  var commander = new Commander(commands);

  before("set up sandbox", function(done) {
    this.timeout(5000);
    Init.sandbox("bare", function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.logger = logger;
      config.networks.development.provider = TestRPC.provider();
      config.mocha = {
        reporter: new Reporter(logger)
      }
      done();
    });
  });

  before("copy over test contract", function(done) {
    var from = path.join(__dirname, "TestWithBalance.sol");
    var to = config.test_directory;
    copy(from, to, done);
  });

  // For this scenario, see the TestWithBalance.sol file for the actual test case.
  // It'll test that its balance equals what it expect. We'll check the log to
  // ensure everything worked out fine.
  it("will run the test and have the correct balance", function(done) {
    this.timeout(20000);

    commander.run("test", config, function(err) {
      if (err != 0) {
        if (typeof err == "number") {
          err = new Error("Unknown exit code: " + err);
        }
        return done(err);
      }

      assert(logger.contents().indexOf("1 passing") >= 0);

      done();
    });
  });

});
