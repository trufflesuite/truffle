const assert = require("assert");
const pluginLoader = require("../lib/plugin");
const TruffleError = require("truffle-error");
const originalRequire = require("original-require");
const path = require("path");

describe("plugin loader", () => {
  originalRequire("app-module-path").addPath(
    path.resolve(process.cwd(), "test/mockPlugins")
  );

  describe("checkPluginConfig", () => {
    it("throws when passed an options.plugins non-array or empty array value", () => {
      assert.throws(
        () => {
          pluginLoader.checkPluginConfig({ plugins: "string" });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          pluginLoader.checkPluginConfig({ plugins: 1234 });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          pluginLoader.checkPluginConfig({ plugins: { foo: "bar" } });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          pluginLoader.checkPluginConfig({ plugins: [] });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          pluginLoader.checkPluginConfig({ plugins: null });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          pluginLoader.checkPluginConfig({ plugins: undefined });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
    });

    it("returns options when passed a valid options.plugins array value", () => {
      assert(pluginLoader.checkPluginConfig({ plugins: ["truffle-test"] }));
      let pluginOptions = pluginLoader.checkPluginConfig({
        plugins: ["truffle-test"]
      });
      assert(pluginOptions);
      assert.deepEqual(pluginOptions, { plugins: ["truffle-test"] });

      assert(
        pluginLoader.checkPluginConfig({
          plugins: ["truffle-test", "truffle-analyze"]
        })
      );
      pluginOptions = pluginLoader.checkPluginConfig({
        plugins: ["truffle-test", "truffle-analyze"]
      });
      assert(pluginOptions);
      assert.deepEqual(pluginOptions, {
        plugins: ["truffle-test", "truffle-analyze"]
      });
    });
  });

  describe("checkPluginModules", () => {
    it("throws when options.plugins are specified but not locally or globally installed", () => {
      assert.throws(
        () => {
          pluginLoader.checkPluginModules({
            plugins: ["truffle-analyze"],
            working_directory: process.cwd()
          });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          pluginLoader.checkPluginModules({
            plugins: ["truffle-analyze", "truffle-test"],
            working_directory: process.cwd()
          });
        },
        TruffleError,
        "TruffleError not thrown!"
      );
    });

    it("returns array of locally or globally installed options.plugins", () => {
      assert(
        pluginLoader.checkPluginModules({
          plugins: ["truffle-box"],
          working_directory: process.cwd()
        })
      );
      let pluginArray = pluginLoader.checkPluginModules({
        plugins: ["truffle-box"],
        working_directory: process.cwd()
      });
      assert(pluginArray);
      assert(Array.isArray(pluginArray) && pluginArray.length === 1);

      assert(
        pluginLoader.checkPluginModules({
          plugins: ["truffle-box", "truffle-config"],
          working_directory: process.cwd()
        })
      );
      pluginArray = pluginLoader.checkPluginModules({
        plugins: ["truffle-box", "truffle-config"],
        working_directory: process.cwd()
      });
      assert(pluginArray);
      assert(Array.isArray(pluginArray) && pluginArray.length === 2);
    });
  });

  describe("loadPluginModules", () => {
    it("throws when plugins are installed without a truffle-plugin.json configuration file", () => {
      assert.throws(
        () => {
          pluginLoader.loadPluginModules(["truffle-box"]);
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          pluginLoader.loadPluginModules(["truffle-box", "truffle-config"]);
        },
        TruffleError,
        "TruffleError not thrown!"
      );
    });

    it("returns object of plugins installed with the truffle-plugin.json file loaded", () => {
      assert(pluginLoader.loadPluginModules(["truffle-mock"]));
      let pluginObj = pluginLoader.loadPluginModules(["truffle-mock"]);
      assert(pluginObj);
      assert(typeof pluginObj === "object");
      let pluginConfig = originalRequire("truffle-mock/truffle-plugin.json");
      assert(pluginConfig === pluginObj["truffle-mock"]);

      assert(
        pluginLoader.loadPluginModules(["truffle-mock", "truffle-other-mock"])
      );
      pluginObj = pluginLoader.loadPluginModules([
        "truffle-mock",
        "truffle-other-mock"
      ]);
      assert(pluginObj);
      assert(typeof pluginObj === "object");
      pluginConfig = originalRequire("truffle-other-mock/truffle-plugin.json");
      assert(pluginConfig === pluginObj["truffle-other-mock"]);
    });
  });
  describe("load", () => {
    describe("TruffleError handling", () => {
      it("throws when passed an options.plugins non-array or empty array value", () => {
        assert.throws(
          () => {
            pluginLoader.checkPluginConfig({ plugins: "string" });
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            pluginLoader.checkPluginConfig({ plugins: 1234 });
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            pluginLoader.checkPluginConfig({ plugins: { foo: "bar" } });
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            pluginLoader.checkPluginConfig({ plugins: [] });
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            pluginLoader.checkPluginConfig({ plugins: null });
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            pluginLoader.checkPluginConfig({ plugins: undefined });
          },
          TruffleError,
          "TruffleError not thrown!"
        );
      });

      it("throws when options.plugins are specified but not locally or globally installed", () => {
        assert.throws(
          () => {
            pluginLoader.checkPluginModules({
              plugins: ["truffle-analyze"],
              working_directory: process.cwd()
            });
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            pluginLoader.checkPluginModules({
              plugins: ["truffle-analyze", "truffle-test"],
              working_directory: process.cwd()
            });
          },
          TruffleError,
          "TruffleError not thrown!"
        );
      });

      it("throws when plugins are installed without a truffle-plugin.json configuration file", () => {
        assert.throws(
          () => {
            pluginLoader.loadPluginModules(["truffle-box"]);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            pluginLoader.loadPluginModules(["truffle-box", "truffle-config"]);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
      });
    });

    it("returns object of plugins installed & truffle-plugin.json data when passed a valid options.plugins array", () => {
      assert(
        pluginLoader.load({
          plugins: ["truffle-mock"],
          working_directory: process.cwd()
        })
      );
      let pluginObj = pluginLoader.load({
        plugins: ["truffle-mock"],
        working_directory: process.cwd()
      });
      assert(pluginObj);
      assert(typeof pluginObj === "object");
      let pluginConfig = originalRequire("truffle-mock/truffle-plugin.json");
      assert(pluginConfig === pluginObj["truffle-mock"]);

      assert(
        pluginLoader.load({
          plugins: ["truffle-mock", "truffle-other-mock"],
          working_directory: process.cwd()
        })
      );
      pluginObj = pluginLoader.load({
        plugins: ["truffle-mock", "truffle-other-mock"],
        working_directory: process.cwd()
      });
      assert(pluginObj);
      assert(typeof pluginObj === "object");
      pluginConfig = originalRequire("truffle-other-mock/truffle-plugin.json");
      assert(pluginConfig === pluginObj["truffle-other-mock"]);
    });
  });
});
