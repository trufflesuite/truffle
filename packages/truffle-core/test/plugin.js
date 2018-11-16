const assert = require("assert");
const pluginLoader = require("../lib/plugin");
const TruffleError = require("truffle-error");
const originalRequire = require("original-require");
const path = require("path");

describe.only("plugin loader", () => {
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

    it("returns a plugin array when passed an options.plugins array value", () => {
      assert(pluginLoader.checkPluginConfig({ plugins: ["truffle-test"] }));
      let pluginArray = pluginLoader.checkPluginConfig({
        plugins: ["truffle-test"]
      });
      assert(pluginArray);
      assert(Array.isArray(pluginArray) && pluginArray.length === 1);

      assert(
        pluginLoader.checkPluginConfig({
          plugins: ["truffle-test", "truffle-analyze"]
        })
      );
      pluginArray = pluginLoader.checkPluginConfig({
        plugins: ["truffle-test", "truffle-analyze"]
      });
      assert(pluginArray);
      assert(Array.isArray(pluginArray) && pluginArray.length === 2);
    });
  });

  describe("checkPluginModules", () => {
    it("throws when options.plugins are specified but not locally or globally installed", () => {
      assert.throws(
        () => {
          pluginLoader.checkPluginModules(["truffle-analyze"]);
        },
        TruffleError,
        "TruffleError not thrown!"
      );
      assert.throws(
        () => {
          pluginLoader.checkPluginModules(["truffle-analyze", "truffle-test"]);
        },
        TruffleError,
        "TruffleError not thrown!"
      );
    });

    it("returns array of locally or globally installed options.plugins", () => {
      assert(pluginLoader.checkPluginModules(["truffle-box"]));
      let pluginArray = pluginLoader.checkPluginModules(["truffle-box"]);
      assert(pluginArray);
      assert(Array.isArray(pluginArray) && pluginArray.length === 1);

      assert(
        pluginLoader.checkPluginModules(["truffle-box", "truffle-config"])
      );
      pluginArray = pluginLoader.checkPluginModules([
        "truffle-box",
        "truffle-config"
      ]);
      assert(pluginArray);
      assert(Array.isArray(pluginArray) && pluginArray.length === 2);
    });
  });

  describe("loadPluginModules", () => {
    it("throws when options.plugins are installed without a truffle-plugin.json configuration file", () => {
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
            pluginLoader.checkPluginModules(["truffle-analyze"]);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
        assert.throws(
          () => {
            pluginLoader.checkPluginModules([
              "truffle-analyze",
              "truffle-test"
            ]);
          },
          TruffleError,
          "TruffleError not thrown!"
        );
      });

      it("throws when options.plugins are installed without a truffle-plugin.json configuration file", () => {
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
      assert(pluginLoader.load({ plugins: ["truffle-mock"] }));
      let pluginObj = pluginLoader.load({ plugins: ["truffle-mock"] });
      assert(pluginObj);
      assert(typeof pluginObj === "object");
      let pluginConfig = originalRequire("truffle-mock/truffle-plugin.json");
      assert(pluginConfig === pluginObj["truffle-mock"]);

      assert(
        pluginLoader.load({ plugins: ["truffle-mock", "truffle-other-mock"] })
      );
      pluginObj = pluginLoader.load({
        plugins: ["truffle-mock", "truffle-other-mock"]
      });
      assert(pluginObj);
      assert(typeof pluginObj === "object");
      pluginConfig = originalRequire("truffle-other-mock/truffle-plugin.json");
      assert(pluginConfig === pluginObj["truffle-other-mock"]);
    });
  });
});
