const assert = require("assert");
const CommandRunner = require("../commandRunner");
const MemoryLogger = require("../MemoryLogger");
const sandbox = require("../sandbox");
const path = require("path");

const logger = new MemoryLogger();
let config, project;

const loadSandboxLogger = async function (source) {
  project = path.join(__dirname, source);
  config = await sandbox.load(project);
  config.logger = logger;
  return config;
};

describe("truffle preserve [ @standalone @>=12 ]", () => {
  // These tests are basically duplicates from "truffle run", but for "truffle preserve"
  describe("plugin error handling", () => {
    it("throws when plugins are configured but not installed", async () => {
      await loadSandboxLogger(
        "../../sources/run/mockProjectWithMissingPluginModule"
      );
      await assert.rejects(CommandRunner.run("preserve . --mock", config));
      const output = logger.contents();
      assert(output.includes("listed as a plugin, but not found"));
    }).timeout(10000);

    it("throws when plugins are missing truffle-plugin.json", async () => {
      await loadSandboxLogger(
        "../../sources/run/mockProjectWithMissingPluginConfig"
      );
      await assert.rejects(CommandRunner.run("preserve . --mock", config));
      const output = logger.contents();
      assert(output.includes("Error: truffle-plugin.json not found"));
    }).timeout(10000);

    it("throws if recipe in truffle-plugin.json uses an absolute path", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithAbsolutePath"
      );
      await assert.rejects(CommandRunner.run("preserve . --mock", config));
      const output = logger.contents();
      assert(output.includes("Error: Absolute paths not allowed!"));
    }).timeout(10000);
  });

  describe("preserve error handling", () => {
    it("throws when an unknown environment is specified", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await assert.rejects(
        CommandRunner.run("preserve . --mock --environment unknown", config)
      );
      const output = logger.contents();
      assert(output.includes("Unknown environment"));
    }).timeout(20000);

    it("throws when no recipe is specified", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await assert.rejects(CommandRunner.run("preserve .", config));
      const output = logger.contents();
      assert(output.includes("No (valid) recipe specified"));
    }).timeout(20000);

    it("throws when the specified recipe is not installed", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await assert.rejects(CommandRunner.run("preserve --unknown", config));
      const output = logger.contents();
      assert(output.includes("No (valid) recipe specified"));
    }).timeout(20000);

    it("throws when no target path is specified", async () => {
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await assert.rejects(CommandRunner.run("preserve --mock", config));
      const output = logger.contents();
      assert(output.includes("No preserve target specified"));
    }).timeout(20000);
  });

  describe("success", () => {
    it("runs the specified recipe with default environment", async function () {
      this.timeout(10000);
      await loadSandboxLogger(
        "../../sources/preserve/mockProjectWithWorkingPlugin"
      );
      await CommandRunner.run("preserve . --mock", config);
      const output = logger.contents();
      assert(output.includes("Provided environment name: development"));
    });

    it("runs the specified recipe with a custom environment", async function () {
      this.timeout(10000);
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
