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
    it("should return tag if provided", () => {
      const plugin = new Plugin({
        module: "dummy-recipe",
        definition: {
          tag: "tag-override",
          preserve: { tag: "dummy-recipe", recipe: "." }
        }
      });

      expect(plugin.tag).toEqual("tag-override");
    });

    it("should return undefined if no tag is defined", () => {
      const plugin = new Plugin({
        module: "dummy-loader",
        definition: {
          preserve: { recipe: "." }
        }
      });

      expect(plugin.tag).toEqual(undefined);
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

  describe("loadCompiler()", () => {
    it("should load compiler defined in the plugin definition", () => {
      const plugin = new Plugin({
        module: "dummy-compiler",
        definition: { compile: "index.js" }
      });

      const loadedCompiler = plugin.loadCompiler();
      const expectedResult = "Successfully called dummy-compiler:compile()";
      expect(loadedCompiler.compile()).toEqual(expectedResult);
    });

    it("should throw when compiler plugin definition is an absolute path", () => {
      const plugin = new Plugin({
        module: "dummy-compiler",
        definition: { compile: "/index.js" }
      });

      const expectedError = "Absolute paths not allowed!";
      expect(() => plugin.loadCompiler()).toThrow(expectedError);
    });

    it("should throw when compiler plugin definition is missing", () => {
      const plugin = new Plugin({
        module: "dummy-noDefinition",
        definition: {}
      });

      const expectedError =
        "Plugin dummy-noDefinition does not define a `truffle plugin` compiler.";
      expect(() => plugin.loadCompiler()).toThrow(expectedError);
    });
  });
});
