var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");
var sandbox = require("../sandbox");
var log = console.log;

describe("truffle publish", function() {
  var config;
  var project = path.join(__dirname, '../../sources/ethpm');
  var logger = new MemoryLogger();

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  before("set up sandbox", function() {
    this.timeout(10000);
    return sandbox.create(project).then(conf => {
      config = conf;
      config.network = "development";
      config.logger = logger;
      config.mocha = {
        reporter: new Reporter(logger)
      }
    });
  });

  // This test only validates package assembly. We expect it to run logic up to the attempt to
  // publish to the network and fail.
  it.skip("Can locate all the sources to publish", function(done) {
    this.timeout(30000);

    CommandRunner.run("compile", config, function(err) {
      if (err) {
        log(logger.contents());
        return done(err);
      }
      assert(fs.existsSync(path.join(config.contracts_build_directory, "PLCRVoting.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "EIP20.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "Local.json")));

      CommandRunner.run("publish", config, function(err) {
        var output = logger.contents();

        // We expect publication to be rejected by the client.
        if (!err) {
          log(output);
          done(err);
        }
        assert(output.includes('Uploading sources and publishing'), 'Should have found sources');
        done();
      })
    });
  });
});
