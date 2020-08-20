"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workspace = void 0;
const path_1 = __importDefault(require("path"));
var schema_1 = require("./schema");
Object.defineProperty(exports, "schema", {
  enumerable: true,
  get: function () {
    return schema_1.schema;
  }
});
const pouch_1 = require("./pouch");
const definitions_1 = require("./definitions");
class Workspace {
  constructor({
    workingDirectory,
    adapter: { name, settings } = { name: "fs" }
  }) {
    switch (name) {
      case "fs": {
        this.databases = new pouch_1.FSDatabases({
          definitions: definitions_1.definitions,
          settings: settings || getDefaultFSAdapterSettings(workingDirectory)
        });
        break;
      }
      case "sqlite": {
        this.databases = new pouch_1.SqliteDatabases({
          definitions: definitions_1.definitions,
          settings:
            settings || getDefaultSqliteAdapterSettings(workingDirectory)
        });
        break;
      }
      case "memory": {
        this.databases = new pouch_1.MemoryDatabases({
          definitions: definitions_1.definitions,
          settings
        });
        break;
      }
      default: {
        throw new Error(`Unknown Truffle DB adapter: ${name}`);
      }
    }
  }
  /***************************************************************************
   * Collection queries
   ***************************************************************************/
  bytecodes() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.all("bytecodes");
    });
  }
  compilations() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.all("compilations");
    });
  }
  contracts() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.all("contracts");
    });
  }
  contractInstances() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.all("contractInstances");
    });
  }
  nameRecords() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.all("nameRecords");
    });
  }
  networks() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.all("networks");
    });
  }
  sources() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.all("sources");
    });
  }
  projects() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.all("projects");
    });
  }
  /***************************************************************************
   * Resource queries
   ***************************************************************************/
  bytecode({ id }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.get("bytecodes", id);
    });
  }
  compilation({ id }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.get("compilations", id);
    });
  }
  contract({ id }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.get("contracts", id);
    });
  }
  contractInstance({ id }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.get("contractInstances", id);
    });
  }
  nameRecord({ id }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.get("nameRecords", id);
    });
  }
  network({ id }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.get("networks", id);
    });
  }
  source({ id }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.get("sources", id);
    });
  }
  project({ id }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.get("projects", id);
    });
  }
  projectNames({ project, name, type }) {
    return __awaiter(this, void 0, void 0, function* () {
      const results = yield this.databases.find("projectNames", {
        selector: { "project.id": project.id, name, type }
      });
      const nameRecordIds = results.map(({ nameRecord: { id } }) => id);
      return yield this.databases.find("nameRecords", {
        selector: {
          id: { $in: nameRecordIds }
        }
      });
    });
  }
  /***************************************************************************
   * Mutations
   ***************************************************************************/
  bytecodesAdd({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.add("bytecodes", input);
    });
  }
  compilationsAdd({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.add("compilations", input);
    });
  }
  contractsAdd({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.add("contracts", input);
    });
  }
  contractInstancesAdd({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.add("contractInstances", input);
    });
  }
  nameRecordsAdd({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.add("nameRecords", input);
    });
  }
  networksAdd({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.add("networks", input);
    });
  }
  sourcesAdd({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.add("sources", input);
    });
  }
  projectsAdd({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.add("projects", input);
    });
  }
  projectNamesAssign({ input }) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.databases.update("projectNames", input);
    });
  }
  /***************************************************************************
   * Misc.
   ***************************************************************************/
  contractNames() {
    return __awaiter(this, void 0, void 0, function* () {
      const contracts = yield this.databases.find("contracts", {
        selector: {},
        fields: ["name"]
      });
      return contracts.map(({ name }) => name);
    });
  }
}
exports.Workspace = Workspace;
const getDefaultFSAdapterSettings = workingDirectory => ({
  directory: path_1.default.join(workingDirectory, ".db", "json")
});
const getDefaultSqliteAdapterSettings = workingDirectory => ({
  directory: path_1.default.join(workingDirectory, ".db", "sqlite")
});
//# sourceMappingURL=index.js.map
