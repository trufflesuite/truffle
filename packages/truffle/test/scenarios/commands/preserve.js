const assert = require("assert");
const CommandRunner = require("../commandrunner");
const MemoryLogger = require("../memorylogger");
const sandbox = require("../sandbox");
const path = require("path");

const logger = new MemoryLogger();
let config, project;

const loadSandboxLogger = source => {
  project = path.join(__dirname, source);
  return sandbox.load(project).then(conf => {
    config = conf;
    config.logger = logger;
  });
};

describe("truffle preserve [ @standalone @>=12 ]", () => {
  // These tests are basically duplicates from "truffle run", but for "truffle preserve"
  describe("plugin error handling", () => {
    it("should throw when plugins are configured but not installed", async () => {
      await loadSandboxLogger(
        "../../sources/run/mockProjectWithMissingPluginModule"
      );
      await assert.rejects(CommandRunner.run("preserve . --mock", config));
      const output = logger.contents();
      assert(output.includes("listed as a plugin, but not found"));
    }).timeout(10000);

    it("should throw when plugins are missing truffle-plugin.json", async () => {
      await loadSandboxLogger(
        "../../sources/run/mockProjectWithMissingPluginConfig"
      );
      await assert.rejects(CommandRunner.run("preserve . --mock", config));
      const output = logger.contents();
      assert(output.includes("Error: truffle-plugin.json not found"));
    }).timeout(10000);

    it("should throw if recipe in truffle-plugin.json uses an absolute path", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithAbsolutePath"
      );
      await assert.rejects(CommandRunner.run("preserve . --mock", config));
      const output = logger.contents();
      assert(output.includes("Error: Absolute paths not allowed!"));
    }).timeout(10000);
  });

  describe("preserve error handling", () => {
    it("should throw when an unknown environment is specified", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await assert.rejects(
        CommandRunner.run("preserve . --mock --environment unknown", config)
      );
      const output = logger.contents();
      assert(output.includes("Unknown environment"));
    }).timeout(20000);

    it("should throw when no recipe is specified", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await assert.rejects(CommandRunner.run("preserve .", config));
      const output = logger.contents();
      assert(output.includes("No (valid) recipe specified"));
    }).timeout(20000);

    it("should throw when the specified recipe is not installed", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await assert.rejects(CommandRunner.run("preserve --unknown", config));
      const output = logger.contents();
      assert(output.includes("No (valid) recipe specified"));
    }).timeout(20000);

    it("should throw when no target path is specified", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await assert.rejects(CommandRunner.run("preserve --mock", config));
      const output = logger.contents();
      assert(output.includes("No preserve target specified"));
    }).timeout(20000);
  });

  describe("success", () => {
    it("should run the specified recipe with default environment", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await CommandRunner.run("preserve . --mock", config);
      const output = logger.contents();
      assert(output.includes("Provided environment name: development"));
    });

    it("should run the specified recipe with a custom environment", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await CommandRunner.run(
        "preserve . --mock --environment production",
        config
      );
      const output = logger.contents();
      assert(output.includes("Provided environment name: production"));
    });
  });
});
