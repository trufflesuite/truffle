const level = require("level-party");
const memdown = require("memdown");

export class StorageBackend {
  static availableBackends() {
    return ["leveldown", "sqlite", "memory"];
  }
  static createBackend(database?: string, directory?: string) {
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
