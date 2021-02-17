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
});
