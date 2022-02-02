import { StorageBackend } from "../../src/storage/backend";
import { expect, assert } from "chai";

const os = require("os");

describe("StorageBackend", () => {
  let storage;
  const tmpDir = os.tmpdir();
  const testDirectory = `${tmpDir}/storageBackend-test`;
  describe("memory", () => {
    it("creates an in-memory db", () => {
      storage = StorageBackend.createBackend("memory");

      expect(storage.constructor.name).to.equal("MemDOWN");
    });
    it("disregards the directory parameter", () => {
      storage = StorageBackend.createBackend("memory");

      expect(storage.constructor.name).to.equal("MemDOWN");
    });
  });
  describe("sqlite", () => {
    it("creates a sqlite db", () => {
      storage = StorageBackend.createBackend("sqlite", testDirectory);

      expect(storage.constructor.name).to.equal("SQLdown");
    });
  });
  describe("leveldown", () => {
    it("creates a leveldown db", () => {
      storage = StorageBackend.createBackend("leveldown", testDirectory);

      expect(storage.constructor.name).to.equal("LevelDOWN");
    });
  });
  describe("default", () => {
    it("creates an in-memory db if no or invalid database name is passed", () => {
      storage = StorageBackend.createBackend("not a valid database");
    });
  });
  describe("throws", () => {
    describe("leveldown", () => {
      it("no directory provided ", () => {
        assert.throws(
          () => {
            StorageBackend.createBackend("leveldown");
          },
          Error,
          "constructor requires a location string argument"
        );
      });
    });
    describe("sqlite", () => {
      it("no directory provided", () => {
        assert.throws(
          () => {
            StorageBackend.createBackend("sqlite");
          },
          Error,
          "constructor requires at least a location argument"
        );
      });
    });
  });
});
