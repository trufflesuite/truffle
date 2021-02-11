import { Plugin } from "../lib";
import path from "path";
const originalRequire = require("original-require");

describe("Plugin", () => {
  // Add fixture folder to require path so dummy plugins can be found
  originalRequire("app-module-path").addPath(
    path.resolve(__dirname, "fixture")
  );

  describe("get commands()", () => {
    it("should list all commands defined in the plugin definition", () => {
      const plugin = new Plugin({
        module: "dummy-plugin-1",
        definition: { commands: { "dummy-command-1": "index.js" } }
      });

      expect(plugin.commands).toEqual(["dummy-command-1"]);
    });
  });

  describe("definesCommand()", () => {
    it("should return true if the plugin definition defines the requested command", () => {
      const plugin = new Plugin({
        module: "dummy-plugin-1",
        definition: { commands: { "dummy-command-1": "index.js" } }
      });

      const definesCommand = plugin.definesCommand("dummy-command-1");

      expect(definesCommand).toBeTruthy();
    });

    it("should return false if the plugin definition does not define the requested command", () => {
      const plugin = new Plugin({
        module: "dummy-plugin-1",
        definition: { commands: { "dummy-command-1": "index.js" } }
      });

      const definesCommand = plugin.definesCommand("undefind-command");

      expect(definesCommand).toBeFalsy();
    });
  });

  describe("loadCommand()", () => {
    it("should load command defined in the plugin definition", () => {
      const plugin = new Plugin({
        module: "dummy-plugin-1",
        definition: { commands: { "dummy-command-1": "index.js" } }
      });

      const loadedCommand = plugin.loadCommand("dummy-command-1");

      expect(loadedCommand).toBeInstanceOf(Function);

      const commandResult = loadedCommand();

      expect(commandResult).toEqual("Successfully called dummy-plugin-1");
    });

    it("should throw when requested command is not defined in the plugin definition", () => {
      const plugin = new Plugin({
        module: "dummy-plugin-1",
        definition: { commands: { "dummy-command-1": "index.js" } }
      });

      const expectedError = /does not define command/;
      expect(() => plugin.loadCommand("undefined-command")).toThrow(
        expectedError
      );
    });

    it("should throw when command's source module is an absolute path", () => {
      const plugin = new Plugin({
        module: __dirname,
        definition: {
          commands: { "dummy-command-1": "/index.js" }
        }
      });

      const expectedError = /Absolute paths not allowed/;
      expect(() => plugin.loadCommand("dummy-command-1")).toThrow(
        expectedError
      );
    });
  });

  describe("get tag()", () => {
    it("should return tag if defined", () => {
      const plugin = new Plugin({
        module: "dummy-loader",
        definition: {
          tag: "tag-override",
          preserve: { tag: "dummy-loader", loader: "." }
        }
      });

      expect(plugin.tag).toEqual("tag-override");
    });

    it("should return module if undefined", () => {
      const plugin = new Plugin({
        module: "dummy-loader",
        definition: {
          preserve: { tag: "dummy-loader", loader: "." }
        }
      });

      expect(plugin.tag).toEqual("dummy-loader");
    });
  });

  describe("definesRecipe()", () => {
    it("should return true if the plugin definition defines a recipe", () => {
      const plugin = new Plugin({
        module: "dummy-recipe",
        definition: {
          tag: "dummy-recipe",
          preserve: { tag: "dummy-recipe", recipe: "." }
        }
      });

      const definesRecipe = plugin.definesRecipe();

      expect(definesRecipe).toBeTruthy();
    });

    it("should return false if the plugin definition does not define a recipe", () => {
      const plugin = new Plugin({
        module: "dummy-loader",
        definition: {
          tag: "dummy-loader",
          preserve: { tag: "dummy-loader", loader: "." }
        }
      });

      const definesRecipe = plugin.definesRecipe();

      expect(definesRecipe).toBeFalsy();
    });

    it("should return false if the plugin is not a preserve plugin", () => {
      const plugin = new Plugin({
        module: "dummy-plugin-1",
        definition: { commands: { "dummy-command-1": "index.js" } }
      });

      const definesRecipe = plugin.definesRecipe();

      expect(definesRecipe).toBeFalsy();
    });
  });

  describe("definesLoader()", () => {
    it("should return true if the plugin definition defines a loader", () => {
      const plugin = new Plugin({
        module: "dummy-loader",
        definition: {
          tag: "dummy-loader",
          preserve: { tag: "dummy-loader", loader: "." }
        }
      });

      const definesLoader = plugin.definesLoader();

      expect(definesLoader).toBeTruthy();
    });

    it("should return false if the plugin definition does not define a loader", () => {
      const plugin = new Plugin({
        module: "dummy-recipe",
        definition: {
          tag: "dummy-recipe",
          preserve: { tag: "dummy-recipe", recipe: "." }
        }
      });

      const definesLoader = plugin.definesLoader();

      expect(definesLoader).toBeFalsy();
    });

    it("should return false if the plugin is not a preserve plugin", () => {
      const plugin = new Plugin({
        module: "dummy-plugin-1",
        definition: { commands: { "dummy-command-1": "index.js" } }
      });

      const definesLoader = plugin.definesLoader();

      expect(definesLoader).toBeFalsy();
    });
  });

  describe("loadRecipe()", () => {
    it("should load recipe defined in the plugin definition", () => {
      const plugin = new Plugin({
        module: "dummy-recipe",
        definition: {
          tag: "dummy-recipe",
          preserve: { tag: "dummy-recipe", recipe: "." }
        }
      });

      const loadedRecipe = plugin.loadRecipe();

      expect(loadedRecipe.name).toEqual("dummy-recipe");

      const recipeResult = loadedRecipe.preserve();

      expect(recipeResult).toEqual(
        "Successfully called dummy-recipe:preserve()"
      );
    });

    it("should throw when no recipe is defined in the plugin definition", () => {
      const plugin = new Plugin({
        module: "dummy-loader",
        definition: {
          tag: "dummy-loader",
          preserve: { tag: "dummy-loader", loader: "." }
        }
      });

      const expectedError = /does not define a `truffle preserve` recipe/;
      expect(() => plugin.loadRecipe()).toThrow(expectedError);
    });

    it("should throw when recipe's source module is an absolute path", () => {
      const plugin = new Plugin({
        module: "dummy-recipe",
        definition: {
          tag: "dummy-recipe",
          preserve: { tag: "dummy-recipe", recipe: "/index.js" }
        }
      });

      const expectedError = /Absolute paths not allowed/;
      expect(() => plugin.loadRecipe()).toThrow(expectedError);
    });
  });

  describe("loadLoader()", () => {
    it("should load loader defined in the plugin definition", () => {
      const plugin = new Plugin({
        module: "dummy-loader",
        definition: {
          tag: "dummy-loader",
          preserve: { tag: "dummy-loader", loader: "." }
        }
      });

      const loadedLoader = plugin.loadLoader();

      expect(loadedLoader.name).toEqual("dummy-loader");

      const loaderResult = loadedLoader.load();

      expect(loaderResult).toEqual(
        "Successfully called dummy-loader:load()"
      );
    });

    it("should throw when no loader is defined in the plugin definition", () => {
      const plugin = new Plugin({
        module: "dummy-recipe",
        definition: {
          tag: "dummy-recipe",
          preserve: { tag: "dummy-recipe", recipe: "." }
        }
      });

      const expectedError = /does not define a `truffle preserve` loader/;
      expect(() => plugin.loadLoader()).toThrow(expectedError);
    });

    it("should throw when loader's source module is an absolute path", () => {
      const plugin = new Plugin({
        module: "dummy-loader",
        definition: {
          tag: "dummy-loader",
          preserve: { tag: "dummy-loader", loader: "/index.js" }
        }
      });

      const expectedError = /Absolute paths not allowed/;
      expect(() => plugin.loadLoader()).toThrow(expectedError);
    });
  });
});
