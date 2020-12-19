const assert = require("assert");
const sinon = require("sinon");
const path = require("path");
const originalRequire = require("original-require");
const runHandler = require("../../lib/commands/run/run");
const TruffleError = require("@truffle/error");
const { Plugins } = require("@truffle/plugins");

describe("run handler", () => {
  let nonCommandPluginsConfig,
    commandPluginsConfig,
    absolutePathpluginsConfig,
    spyDone;

  before(() => {
    // Add mockPlugins folder to require path so stub plugins can be found
    originalRequire("app-module-path").addPath(
      path.resolve(__dirname, "../mockPlugins")
    );

    // plugins that don't support "truffle run stub"
    nonCommandPluginsConfig = {
      plugins: ["truffle-mock", "truffle-other-mock"],
      working_directory: process.cwd()
    };

    // plugins that do support "truffle run stub"
    commandPluginsConfig = {
      plugins: [
        "truffle-stub",
        "truffle-other-stub",
        "truffle-cb-stub",
        "truffle-promise-stub"
      ],
      working_directory: process.cwd()
    };

    // plugins with an absolute file path in truffle-plugin.json
    absolutePathpluginsConfig = {
      plugins: ["truffle-other-stub"],
      working_directory: process.cwd()
    };

    // done() callback
    spyDone = sinon.spy();
  });

  describe("initializeCommand", () => {
    it("throws when passed pluginConfigs that don't support a given command", () => {
      const nonCommandPlugins = Plugins.listAll(nonCommandPluginsConfig);
      const commandPlugins = Plugins.listAll(commandPluginsConfig);

      assert.throws(
        () => {
          runHandler.initializeCommand("stub", nonCommandPlugins);
        },
        TruffleError,
        "TruffleError not thrown!"
      );

      assert.throws(
        () => {
          runHandler.initializeCommand("notStub", commandPlugins);
        },
        TruffleError,
        "TruffleError not thrown!"
      );
    });

    it("returns the exported command when passed pluginConfigs that do support a given command", () => {
      const commandPlugins = Plugins.listAll(commandPluginsConfig);

      let exportedCommand = runHandler.initializeCommand(
        "stub",
        commandPlugins
      );

      assert(exportedCommand);
      assert(typeof exportedCommand === "function");
    });
  });

  describe("run", () => {
    describe("TruffleError handling", () => {
      it("throws when passed pluginConfigs that don't support a given command", () => {
        assert.throws(
          () => {
            runHandler.run("stub", nonCommandPluginsConfig, spyDone);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            runHandler.run("notStub", commandPluginsConfig, spyDone);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
      });

      it("throws when passed pluginConfigs containing an absolute file path", () => {
        assert.throws(
          () => {
            runHandler.run("stub", absolutePathpluginsConfig, spyDone);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
      });
    });

    it("runs a third-party command when passed pluginConfigs that do support a given command", () => {
      runHandler.run("stub", commandPluginsConfig, spyDone);
      assert.ok(spyDone);
    });

    it("runs a third-party asynchronous command when passed pluginConfigs that do support a given command", () => {
      runHandler.run("cb-stub", commandPluginsConfig, spyDone);
      assert.ok(spyDone);
    });

    it("runs a third-party promise command when passed pluginConfigs that do support a given command", () => {
      runHandler.run("promise-stub", commandPluginsConfig, spyDone);
      assert.ok(spyDone);
    });
  });
});
