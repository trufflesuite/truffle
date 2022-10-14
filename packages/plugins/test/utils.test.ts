import { normalizeConfigPlugins, resolves } from "../lib";
import path from "path";

describe("Plugin utilities", () => {
  describe("resolves()", () => {
    it("should return true when absolute path module resolves successfully", () => {
      const absolutePath = path.resolve(__dirname, "../lib");

      const moduleResolved = resolves(absolutePath);

      expect(moduleResolved).toBeTruthy();
    });

    it("should return true when node module resolves successfully", () => {
      const moduleResolved = resolves("jest");

      expect(moduleResolved).toBeTruthy();
    });

    it.skip("should return false when using any relative path", () => {
      const moduleResolved = resolves("../lib");

      expect(moduleResolved).toBeFalsy();
    });

    it("should return false when relative path module does not resolve successfully", () => {
      const moduleResolved = resolves("./non-existing-module");

      expect(moduleResolved).toBeFalsy();
    });

    it("should return false when absolute path module does not resolve successfully", () => {
      const absolutePath = path.resolve(__dirname, "./non-existing-module");
      const moduleResolved = resolves(absolutePath);

      expect(moduleResolved).toBeFalsy();
    });

    it("should return false when node module does not resolve successfully", () => {
      const absolutePath = path.resolve("non-existing-module");
      const moduleResolved = resolves(absolutePath);

      expect(moduleResolved).toBeFalsy();
    });
  });

  describe("normalizeConfigPlugins()", () => {
    it("should normalize all string-based plugins to PluginConfig objects", () => {
      const rawPlugins = [{ module: "jest" }, "@truffle/error"];

      const normalizedPlugins = normalizeConfigPlugins(rawPlugins);

      const expectedPlugins = [
        { module: "jest" },
        { module: "@truffle/error" }
      ];
      expect(normalizedPlugins).toEqual(expectedPlugins);
    });

    it("should throw when a plugin module is not resolvable", () => {
      const expectedError =
        /listed as a plugin, but not found in global or local node modules/;

      expect(() => normalizeConfigPlugins(["non-existing-module"])).toThrow(
        expectedError
      );
      expect(() =>
        normalizeConfigPlugins([{ module: "non-existing-module" }])
      ).toThrow(expectedError);
    });

    it("should filter duplicate plugins", () => {
      const rawPlugins = [
        { module: "jest" },
        "jest",
        { module: "@truffle/error" },
        "@truffle/error"
      ];

      const normalizedPlugins = normalizeConfigPlugins(rawPlugins);

      const expectedPlugins = [
        { module: "jest" },
        { module: "@truffle/error" }
      ];
      expect(normalizedPlugins).toEqual(expectedPlugins);
    });
  });
});
