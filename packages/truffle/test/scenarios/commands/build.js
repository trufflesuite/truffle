const assert = require("assert");
const CommandRunner = require("../commandrunner");
const MemoryLogger = require("../memorylogger");
const sandbox = require("../sandbox");
const path = require("path");

describe("truffle build", function() {
  const logger = new MemoryLogger();
  let config, project;

  describe("when there is no build script in config", function() {
    beforeEach("set up sandbox", function() {
      this.timeout(10000);
      project = path.join(__dirname, '../../sources/build/projectWithoutBuildScript');
      return sandbox.create(project).then(conf => {
        config = conf;
        config.logger = logger;
      });
    });

    it("should not error", function(done) {
      CommandRunner.run("build", config, (error) => {
        assert(typeof error === "undefined");
        done();
      });
    });
    it("whines about having no build config", function(done) {
      CommandRunner.run("build", config, (error) => {
        const output = logger.contents();
        assert(output.includes("No build configuration found."));
        done();
      });
    });
  });

  describe("when there is a proper build config", function() {
    beforeEach("set up sandbox", function() {
      this.timeout(10000);
      project = path.join(__dirname, '../../sources/build/projectWithBuildScript');
      return sandbox.create(project).then(conf => {
        config = conf;
        config.logger = logger;
      });
    });
    it("runs the build script", function(done) {
      CommandRunner.run("build", config, (error) => {
        const output = logger.contents();
        assert(output.includes("'this is the build script'"));
        done();
      });
    });
  });

  describe("when there is an object in the build config", function() {
    beforeEach("set up sandbox", function() {
      this.timeout(10000);
      project = path.join(__dirname, '../../sources/build/projectWithObjectInBuildScript');
      return sandbox.create(project).then(conf => {
        config = conf;
        config.logger = logger;
      });
    });
    it("tells the user it shouldn't use an object", function(done) {
      CommandRunner.run("build", config, (error) => {
        const output = logger.contents();
        assert(output.includes("Build configuration can no longer be specified as an object."));
        done();
      });
    });
  });
});
