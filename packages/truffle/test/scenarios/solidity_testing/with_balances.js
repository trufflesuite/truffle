var Box = require("truffle-box");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var fs = require("fs-extra");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");

describe("Solidity Tests with balances", function() {
  var logger = new MemoryLogger();
  var config;

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  before("set up sandbox", function(done) {
    this.timeout(5000);
    Box.sandbox("bare", function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.logger = logger;
      config.network = "development";
      config.mocha = {
        reporter: new Reporter(logger)
      }
      done();
    });
  });

  before("copy over test contract", function() {
    var from = path.join(__dirname, "TestWithBalance.sol");
    return fs.ensureDir(config.test_directory).then(function() {
      return fs.copy(from, config.test_directory + "/TestWithBalance.sol");
    });
  });

  // For this scenario, see the TestWithBalance.sol file for the actual test case.
  // It'll test that its balance equals what it expect. We'll check the log to
  // ensure everything worked out fine.
  it("will run the test and have the correct balance", function(done) {
    this.timeout(40000);

    CommandRunner.run("test", config, function(err) {
      var output = logger.contents();
      if (err) {
        console.log(output);
        return done(err);
      }

      assert(output.indexOf("1 passing") >= 0);

      done();
    });
  });

});
