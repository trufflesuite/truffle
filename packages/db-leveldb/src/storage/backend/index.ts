const leveldown = require("leveldown");
const sqldown = require("sqldown");
const memdown = require("memdown");

export class StorageBackend {
  static availableBackends() {
    return ["leveldown", "sqlite", "memory"];
  }
  static createBackend(database?: string, directory?: string) {
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
