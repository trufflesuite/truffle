import { transformSchema, FilterRootFields } from "graphql-tools";

import { scopeSchemas } from "./utils";

import { abiSchema, schema as artifactsSchema } from "truffle-db/artifacts";
import { schema as workspaceSchema } from "truffle-db/workspace";

import { readInstructions } from "./bytecode";

export const schema = scopeSchemas({
  subschemas: {
    artifacts: artifactsSchema,
    workspace: workspaceSchema,
  },
  typeDefs: [
    // add types from abi schema
    transformSchema(abiSchema, [
      new FilterRootFields( () => false )
    ])
  ],
  resolvers: {
    Bytecode: {
      instructions: {
        fragment: "... on Bytecode { bytes sourceMap }",
        resolve: ({ bytes, sourceMap }) =>
          readInstructions(bytes, sourceMap)
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
        resolve (value) {
          return "function";
        }
      }
    }

  }
});
