"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageBackend = void 0;
const level = require("level-party");
const memdown = require("memdown");
class StorageBackend {
  static availableBackends() {
    return ["leveldown", "sqlite", "memory"];
  }
  static createBackend(database, directory) {
    switch (database) {
      case "leveldown":
        return level(directory, {
          valueEncoding: "json"
        });
      case "leveldb":
        return level(directory, {
          valueEncoding: "json"
        });
      case "memory":
        return memdown();
      default:
        return memdown();
    }
  }
}
exports.StorageBackend = StorageBackend;
