"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageBackend = void 0;
const leveldown = require("leveldown");
const sqldown = require("sqldown");
const memdown = require("memdown");
class StorageBackend {
  static availableBackends() {
    return ["leveldown", "sqlite", "memory"];
  }
  static createBackend(database, directory) {
    switch (database) {
      case "leveldown":
        return leveldown(directory);
      case "sqlite":
        return sqldown(directory);
      case "memory":
        return memdown();
      default:
        return memdown();
    }
  }
}
exports.StorageBackend = StorageBackend;
