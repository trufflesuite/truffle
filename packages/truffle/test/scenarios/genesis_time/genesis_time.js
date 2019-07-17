const Box = require("truffle-box");
const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const assert = require("assert");
const Reporter = require("../reporter");
const Server = require("../server");

describe("Genesis time config for truffle test", function() {
  const logger = new MemoryLogger();
  let config, options;

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

  before("set up sandbox", async () => {
    this.timeout(10000);
    options = { name: "default", force: true };
    config = await Box.sandbox(options);
    config.network = "test";
    config.genesis_time = "1/32/19";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };
  });

  it("will run test and output whines about invalid date", function(done) {
    this.timeout(90000);
    CommandRunner.run("test", config, function(err) {
      const output = logger.contents();
      console.log(config.genesis_time);
      console.log(output);
      processErr(err, output);
      assert(output.includes("Invalid"));
      done();
    });
  });

  /*
  describe("genesis-time option set to bad input", function() {
    before("set up sandbox", function(done) {
      this.timeout(10000);
      options = { name: "default", force: true };
      Box.sandbox(options, function(err, conf) {
        if (err) return done(err);
        config = conf;
        config.network = "test";
        config.logger = logger;
        config.genesis_time = "1/32/19";
        config.mocha = {
          reporter: new Reporter(logger)
        };
          done();
        });
    });

    it("will run test and output whines about invalid date", function(done) {
      this.timeout(90000);  
      CommandRunner.run("test", config, function(err) {
        const output = logger.contents();
        console.log(config.genesis_time);
        console.log(output);
        processErr(err, output);
        assert(output.includes("Invalid"));
        done();
      });
    });
  });

  describe("Genesis time config set with valid input", function() {
    before("set up sandbox", function(done) {
      this.timeout(10000);
      options = { name: "default", force: true };
      Box.sandbox(options, function(err, conf) {
        if (err) return done(err);
        config = conf;
        config.network = "test";
        config.logger = logger;
        config.genesis_time = "1/31/19";
        config.mocha = {
          reporter: new Reporter(logger)
        };
        done();
      });
    });

    it("will run test and error should be undefined", function(done) {
      this.timeout(90000);  
      CommandRunner.run("test", config, function(err) {
        const output = logger.contents();
        console.log(config.genesis_time);
        console.log(output);
        processErr(err, output);
        assert(typeof err === "undefined");
        done();
      });
    });
  });*/
});
