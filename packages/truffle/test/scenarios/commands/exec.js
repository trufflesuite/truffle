var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");
var sandbox = require("../sandbox");
var log = console.log;

describe("truffle exec", function() {
  var config;
  var project = path.join(__dirname, '../../sources/exec');
  var logger = new MemoryLogger();

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  beforeEach("set up sandbox", function() {
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

  function processErr(err, output){
    if (err){
      log(output);
      throw new Error(err);
    }
  }

  it("runs script after compiling", function(done) {
    this.timeout(20000);

    CommandRunner.run("compile", config, function(err) {
      processErr(err);

      assert(fs.existsSync(path.join(config.contracts_build_directory, "Executable.json")));

      CommandRunner.run("exec script.js", config, function(err) {
        const output = logger.contents();
        processErr(err, output);
        assert(output.includes('5'));
        done();
      })
    });
  });

  // Check accuracy of next test
  it('errors when run without compiling', function(done){
    this.timeout(30000);
    CommandRunner.run("exec script.js", config, function(err) {
      assert(err !== null);
      done();
    });
  });

  it('succeeds when -c flag is set', function(done){
    this.timeout(30000);

    CommandRunner.run("exec -c script.js", config, function(err) {
      const output = logger.contents();
      processErr(err, output);
      assert(output.includes('5'));
      done();
    });
  });
});