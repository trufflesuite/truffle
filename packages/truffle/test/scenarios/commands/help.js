const assert = require("assert");
const CommandRunner = require("../commandrunner");
const MemoryLogger = require("../memorylogger");
const sandbox = require("../sandbox");
const path = require("path");

describe("truffle help", () => {
  const logger = new MemoryLogger();
  let config, project;

  beforeEach("set up sandbox & config for logger", () => {
    project = path.join(
      __dirname,
      "../../sources/build/projectWithBuildScript"
    );
    return sandbox.create(project).then(conf => {
      config = conf;
      config.logger = logger;
    });
  });

  describe("when run without arguments", () => {
    it("displays general help", function(done) {
      CommandRunner.run("help", config, error => {
        const output = logger.contents();

        assert(output.includes("Usage: truffle <command> [options]"));
        done();
      });
    });
  });

  describe("when run with an argument", () => {
    it("tells the user if it doesn't recognize the given command", function(done) {
      CommandRunner.run("help eggplant", config, error => {
        const output = logger.contents();

        assert(output.includes("Cannot find the given command 'eggplant'"));
        done();
      });
    }).timeout(20000);

    it("displays help for the given command when valid", function(done) {
      CommandRunner.run("help compile", config, error => {
        const output = logger.contents();

        assert(output.includes("Description:  Compile contract source files"));
        done();
      });
    }).timeout(20000);
  });
});
