"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteDatabases = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const pouchdb_1 = __importDefault(require("pouchdb"));
const pouchdb_adapter_node_websql_1 = __importDefault(require("pouchdb-adapter-node-websql"));
const databases_1 = require("./databases");
class SqliteDatabases extends databases_1.Databases {
    setup(options) {
        this.directory = options.settings.directory;
        fs_extra_1.default.ensureDir(this.directory);
        pouchdb_1.default.plugin(pouchdb_adapter_node_websql_1.default);
    }
    createDatabase(resource) {
        const savePath = path_1.default.resolve(this.directory, resource);
        return new pouchdb_1.default(savePath, { adapter: "websql" });
    }
}
exports.SqliteDatabases = SqliteDatabases;
//# sourceMappingURL=sqlite.js.map