import { Plugin, Plugins, TruffleConfig } from "../lib";
import path from "path";
const originalRequire = require("original-require");

describe("Plugins", () => {
  // Add fixture folder to require path so dummy plugins can be found
  originalRequire("app-module-path").addPath(
    path.resolve(__dirname, "fixture")
  );

  describe("listAll()", () => {
    it("should list all plugins defined in a Truffle config object", () => {
      const config = {
        working_directory: __dirname,
        plugins: ["dummy-plugin-1", "dummy-plugin-2", "dummy-recipe"]
      };

      const allPlugins = Plugins.listAll(config);

      const expectedPlugins = [
        new Plugin({
          module: "dummy-plugin-1",
          definition: { commands: { "dummy-command-1": "index.js" } }
        }),
        new Plugin({
          module: "dummy-plugin-2",
          definition: { commands: { "dummy-command-2": "index.js" } }
        }),
        new Plugin({
          module: "dummy-recipe",
          definition: {
            tag: "dummy-recipe",
            preserve: { tag: "dummy-recipe", recipe: "." }
          }
        })
      ];

      expect(allPlugins).toEqual(expectedPlugins);
    });

    it("should list no plugins if none are defined in a Truffle config object", () => {
      const config = {
        working_directory: __dirname,
      };

      const allPlugins = Plugins.listAll(config as TruffleConfig);

      expect(allPlugins).toEqual([]);
    });

    it("should filter duplicate plugins", () => {
      const config = {
        working_directory: __dirname,
        plugins: ["dummy-plugin-1", "dummy-plugin-1"]
      };

      const allPlugins = Plugins.listAll(config);

      const expectedPlugins = [
        new Plugin({
          module: `dummy-plugin-1`,
          definition: { commands: { "dummy-command-1": "index.js" } }
        })
      ];

      expect(allPlugins).toEqual(expectedPlugins);
    });

    it("should throw an error when a listed plugin cannot be found", () => {
      const config = {
        working_directory: __dirname,
        plugins: ["non-existent-plugin"]
      };

      const expectedError = /listed as a plugin, but not found in global or local node modules/;

      expect(() => Plugins.listAll(config)).toThrow(expectedError);
    });

    it("should throw an error when a listed plugin does not contain a truffle-plugin.json file", () => {
      const config = {
        working_directory: __dirname,
        plugins: ["jest"]
      };

      const expectedError = /truffle-plugin\.json not found/;

      expect(() => Plugins.listAll(config)).toThrow(expectedError);
    });

    it("should propagate tag overrides", () => {
      const config = {
        working_directory: __dirname,
        plugins: [{ tag: "tag-override", module: "dummy-recipe" }]
      };

      const allPlugins = Plugins.listAll(config);

      const expectedPlugins = [
        new Plugin({
          module: "dummy-recipe",
          definition: {
            tag: "tag-override",
            preserve: { tag: "dummy-recipe", recipe: "." }
          }
        })
      ];

      expect(allPlugins).toEqual(expectedPlugins);
    });
  });

  describe("findPluginsForCommand()", () => {
    it("should find all plugins that implement a given command", () => {
      const config = {
        working_directory: __dirname,
        plugins: ["dummy-plugin-1", "dummy-plugin-2", "dummy-plugin-2-copy"]
      };

      const foundPlugins = Plugins.findPluginsForCommand(
        config,
        "dummy-command-2"
      );

      const expectedPlugins = [
        new Plugin({
          module: "dummy-plugin-2",
          definition: { commands: { "dummy-command-2": "index.js" } }
        }),
        new Plugin({
          module: "dummy-plugin-2-copy",
          definition: { commands: { "dummy-command-2": "index.js" } }
        })
      ];

      expect(foundPlugins).toEqual(expectedPlugins);
    });
  });

  describe("listAllCommandPlugins()", () => {
    it("should list all plugins that implement any command", () => {
      const config = {
        working_directory: __dirname,
        plugins: ["dummy-plugin-1", "dummy-recipe", "dummy-loader"]
      };

      const foundPlugins = Plugins.listAllCommandPlugins(config);

      const expectedPlugins = [
        new Plugin({
          module: "dummy-plugin-1",
          definition: { commands: { "dummy-command-1": "index.js" } }
        })
      ];

      expect(foundPlugins).toEqual(expectedPlugins);
    });
  });

  describe("listAllRecipes()", () => {
    it("should list all plugins that implement a recipe", () => {
      const config = {
        working_directory: __dirname,
        plugins: ["dummy-plugin-1", "dummy-recipe", "dummy-loader"]
      };

      const foundPlugins = Plugins.listAllRecipes(config);

      const expectedPlugins = [
        new Plugin({
          module: "dummy-recipe",
          definition: {
            tag: "dummy-recipe",
            preserve: { tag: "dummy-recipe", recipe: "." }
          }
        })
      ];

      expect(foundPlugins).toEqual(expectedPlugins);
    });
  });

  describe("listAllLoaders()", () => {
    it("should list all plugins that implement a loader", () => {
      const config = {
        working_directory: __dirname,
        plugins: ["dummy-plugin-1", "dummy-recipe", "dummy-loader"]
      };

      const foundPlugins = Plugins.listAllLoaders(config);

      const expectedPlugins = [
        new Plugin({
          module: "dummy-loader",
          definition: {
            tag: "dummy-loader",
            preserve: { tag: "dummy-loader", loader: "." }
          }
        })
      ];

      expect(foundPlugins).toEqual(expectedPlugins);
    });
  });
});
