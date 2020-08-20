"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
const graphql_tools_1 = require("@gnd/graphql-tools");
const utils_1 = require("./utils");
const artifacts_1 = require("@truffle/db/artifacts");
const workspace_1 = require("@truffle/db/workspace");
const loaders_1 = require("@truffle/db/loaders");
const bytecode_1 = require("./bytecode");
exports.schema = utils_1.scopeSchemas({
  subschemas: {
    artifacts: artifacts_1.schema,
    workspace: workspace_1.schema,
    loaders: loaders_1.loaderSchema
  },
  typeDefs: [
    // add types from abi schema
    graphql_tools_1.transformSchema(artifacts_1.abiSchema, [
      new graphql_tools_1.FilterRootFields(() => false)
    ])
  ],
  resolvers: {
    Bytecode: {
      instructions: {
        fragment: "... on Bytecode { bytes sourceMap }",
        resolve: ({ bytes, sourceMap }) =>
          bytecode_1.readInstructions(bytes, sourceMap)
      }
    },
    AbiItem: {
      __resolveType(obj) {
        switch (obj.type) {
          case "event":
            return "Event";
          case "constructor":
            return "ConstructorFunction";
          case "fallback":
            return "FallbackFunction";
          case "function":
          default:
            return "NormalFunction";
        }
      }
    },
    NormalFunction: {
      type: {
        resolve(value) {
          return "function";
        }
      }
    }
  }
});
//# sourceMappingURL=schema.js.map
