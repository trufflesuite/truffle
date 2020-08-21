"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.readSchema = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const graphql_tools_1 = require("@gnd/graphql-tools");
function readSchema() {
    const schemaFile = path_1.default.join(__dirname, "schema.graphql");
    const typeDefs = fs_1.default.readFileSync(schemaFile).toString();
    return graphql_tools_1.makeExecutableSchema({
        typeDefs,
        resolvers: {
            Named: {
                __resolveType: obj => {
                    if (obj.networkId) {
                        return "Network";
                    }
                    else {
                        return "Contract";
                    }
                }
            }
        }
    });
}
exports.readSchema = readSchema;
exports.schema = readSchema();
//# sourceMappingURL=schema.js.map