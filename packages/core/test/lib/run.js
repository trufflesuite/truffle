const path = require("path");
// ***IMPORTANT**: The following line should be added to the very
//                 beginning of your main script!
// Add mockPlugins folder to require path so stub plugins can be found
require("app-module-path").addPath(path.resolve(__dirname, "../mockPlugins"));

const assert = require("assert");
const sinon = require("sinon");
const runHandler = require("../../lib/commands/run/runHandler");

describe("run handler", () => {
  let nonCommandPluginsConfig,
    commandPluginsConfig,
    absolutePathpluginsConfig,
    spyDone;

  before(() => {
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

  describe("run", () => {
    describe("TruffleError handling", () => {
      it("throws when passed pluginConfigs that don't support a given command", () => {
        const expectedError =
          /command not supported by any currently configured plugins/;

        assert.throws(() => {
          runHandler.run("stub", nonCommandPluginsConfig, spyDone);
        }, expectedError);
        assert.throws(() => {
          runHandler.run("notStub", commandPluginsConfig, spyDone);
        }, expectedError);
      });

      it("throws when passed pluginConfigs containing an absolute file path", () => {
        const expectedError = /Absolute paths not allowed!/;
        assert.throws(() => {
          runHandler.run("other-stub", absolutePathpluginsConfig, spyDone);
        }, expectedError);
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
