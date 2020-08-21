"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDatabases = void 0;
const pouchdb_1 = __importDefault(require("pouchdb"));
const pouchdb_adapter_memory_1 = __importDefault(require("pouchdb-adapter-memory"));
const databases_1 = require("./databases");
class MemoryDatabases extends databases_1.Databases {
    setup(options) {
        pouchdb_1.default.plugin(pouchdb_adapter_memory_1.default);
        super.setup(options);
    }
    createDatabase(collectionName) {
        // HACK PouchDB seems to keep memory around even when we do .close()
        // instead: just give each database a unique name
        const databaseName = `${collectionName}__${MemoryDatabases.counter++}`;
        return new pouchdb_1.default(databaseName, { adapter: "memory" });
    }
}
exports.MemoryDatabases = MemoryDatabases;
MemoryDatabases.counter = 0;
//# sourceMappingURL=memory.js.map