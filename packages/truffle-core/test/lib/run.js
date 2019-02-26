const assert = require("assert");
const sinon = require("sinon");
const runHandler = require("../../lib/run");
const pluginLoader = require("../../lib/plugin");
const TruffleError = require("truffle-error");

describe("run handler", () => {
  let nonCommandPlugins, commandPlugins, spyDone;

  before(() => {
    // plugins that don't support "truffle run stub"
    nonCommandPlugins = pluginLoader.load({
      plugins: ["truffle-mock", "truffle-other-mock"],
      working_directory: process.cwd()
    });
    // plugins that do support "truffle run stub"
    commandPlugins = pluginLoader.load({
      plugins: [
        "truffle-stub",
        "truffle-other-stub",
        "truffle-cb-stub",
        "truffle-promise-stub"
      ],
      working_directory: process.cwd()
    });
    // plugins with an absolute file path in truffle-plugin.json
    absolutePathPlugins = pluginLoader.load({
      plugins: ["truffle-other-stub"],
      working_directory: process.cwd()
    });
    // done() callback
    spyDone = sinon.spy();
  });

  describe("initializeCommand", () => {
    it("throws when passed pluginConfigs that don't support a given command", () => {
      assert.throws(
        () => {
          runHandler.initializeCommand(nonCommandPlugins, "stub");
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          runHandler.initializeCommand(commandPlugins, "notStub");
        },
        TruffleError,
        "TruffleError not thrown!"
      );
    });

    it("returns the exported command when passed pluginConfigs that do support a given command", () => {
      let exportedCommand = runHandler.initializeCommand(
        commandPlugins,
        "stub"
      );
      assert(exportedCommand);
      assert(typeof exportedCommand === "function");
    });
  });

  describe("checkPluginObject", () => {
    it("throws when passed an empty pluginCommandObj", () => {
      assert.throws(
        () => {
          runHandler.checkPluginObject({}, "mock");
        },
        TruffleError,
        "TruffleError not thrown!"
      );
    });

    it("doesn't throw when passed a non-empty pluginCommandObj", () => {
      runHandler.checkPluginObject({ "truffle-mock": "index.js" }, "mock");
    });
  });

  describe("checkPluginPath", () => {
    it("throws when passed pluginObj with absolute file path", () => {
      assert.throws(
        () => {
          runHandler.checkPluginPath({ "truffle-mock": "/index.js" });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          runHandler.checkPluginPath({ "truffle-other-mock": "/main.js" });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
    });

    it("returns exported command when passed pluginObj with relative path", () => {
      let exportedCommand = runHandler.checkPluginPath(
        { "truffle-stub": "index.js" },
        "stub"
      );
      assert(exportedCommand);
      assert(typeof exportedCommand === "function");
    });
  });
  describe("requirePlugin", () => {
    it("requires and returns a given exported plugin command", () => {
      let exportedCommand = runHandler.requirePlugin(
        "truffle-stub",
        "index.js"
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
            runHandler.run(nonCommandPlugins, "stub", null, spyDone);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            runHandler.run(commandPlugins, "notStub", null, spyDone);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
      });

      it("throws when passed pluginConfigs containing an absolute file path", () => {
        assert.throws(
          () => {
            runHandler.run(absolutePathPlugins, "stub", null, spyDone);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
      });
    });

    it("runs a third-party command when passed pluginConfigs that do support a given command", () => {
      runHandler.run(commandPlugins, "stub", null, spyDone);
      assert.ok(spyDone);
    });

    it("runs a third-party asynchronous command when passed pluginConfigs that do support a given command", () => {
      runHandler.run(commandPlugins, "cb-stub", null, spyDone);
      assert.ok(spyDone);
    });

    it("runs a third-party promise command when passed pluginConfigs that do support a given command", () => {
      runHandler.run(commandPlugins, "promise-stub", null, spyDone);
      assert.ok(spyDone);
    });
  });
});
