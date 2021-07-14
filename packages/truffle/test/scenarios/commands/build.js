const assert = require("assert");
const CommandRunner = require("../commandrunner");
const MemoryLogger = require("../memorylogger");
const sandbox = require("../sandbox");
const path = require("path");

describe("truffle build [ @standalone ]", () => {
  const logger = new MemoryLogger();
  let config, project;

  describe("when there is no build script in config", () => {
    beforeEach("set up sandbox", function () {
      project = path.join(
        __dirname,
        "../../sources/build/projectWithoutBuildScript"
      );
      return sandbox.create(project).then(conf => {
        config = conf;
        config.logger = logger;
      });
    });

    it("should not error", async () => {
      try {
        await CommandRunner.run("build", config);
      } catch (error) {
        assert(false, "An error should not have occurred.");
      }
    }).timeout(30000);

    it("whines about having no build config", async () => {
      await CommandRunner.run("build", config);
      const output = logger.contents();
      assert(output.includes("No build configuration found."));
    }).timeout(30000);
  });

  describe("when there is a proper build config", () => {
    beforeEach("set up sandbox", function () {
      project = path.join(
        __dirname,
        "../../sources/build/projectWithBuildScript"
      );
      return sandbox.create(project).then(conf => {
        config = conf;
        config.logger = logger;
      });
    });
    it("runs the build script", async function () {
      await CommandRunner.run("build", config);
      const output = logger.contents();
      assert(output.includes("'this is the build script'"));
    }).timeout(30000);
  });

  describe("when there is an object in the build config", () => {
    beforeEach("set up sandbox", function () {
      project = path.join(
        __dirname,
        "../../sources/build/projectWithObjectInBuildScript"
      );
      return sandbox.create(project).then(conf => {
        config = conf;
        config.logger = logger;
      });
    });
    it("tells the user it shouldn't use an object", async function () {
      try {
        await CommandRunner.run("build", config);
      } catch (error) {
        const output = logger.contents();
        assert(
          output.includes(
            "Build configuration can no longer be specified as an object."
          )
        );
      }
    }).timeout(20000);
  });
});
