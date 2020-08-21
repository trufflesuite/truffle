"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSDatabases = void 0;
const path_1 = __importDefault(require("path"));
const pouchdb_1 = __importDefault(require("pouchdb"));
const jsondown = __importStar(require("jsondown"));
const PouchDBUtils = __importStar(require("pouchdb-utils"));
const pouchdb_adapter_leveldb_core_1 = __importDefault(require("pouchdb-adapter-leveldb-core"));
const databases_1 = require("./databases");
class FSDatabases extends databases_1.Databases {
    setup(options) {
        this.directory = options.settings.directory;
        this.jsondownpouch["valid"] = () => true;
        this.jsondownpouch["use_prefix"] = false;
        pouchdb_1.default.adapter("jsondown", this.jsondownpouch, true);
    }
    createDatabase(resource) {
        const savePath = path_1.default.join(this.directory, resource);
        return new pouchdb_1.default(savePath, { adapter: "jsondown" });
    }
    jsondownpouch(opts, callback) {
        const _opts = PouchDBUtils.assign({
            db: jsondown.default
        }, opts);
        pouchdb_adapter_leveldb_core_1.default.call(this, _opts, callback);
    }
}
exports.FSDatabases = FSDatabases;
//# sourceMappingURL=fs.js.map