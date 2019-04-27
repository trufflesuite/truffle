import { abiSchema, schema as artifactsLoaderSchema } from "truffle-db/artifacts";

import {
  mergeSchemas,
  transformSchema,
  FilterRootFields
} from "@gnd/graphql-tools";

export const artifactsLoader = mergeSchemas({
  schemas: [
    artifactsLoaderSchema,
    `type Query {
      source: Source
      contractNames: [String]!
    }`
  ],
  resolvers: {
    Query: {
      source: {
        resolve: (_, args, context, info) => {}
      },
      contractNames: {
        resolve: (_, args, context, info) => info.mergeInfo.delegateToSchema({
          schema: artifactsLoaderSchema,
          operation: "query",
          fieldName: "contractNames",
          args,
          context,
          info
        })
      },
    },
    Source: {
      contents: {
        fragment: `... on ContractObject {
          source { contents, sourcePath }
        }`,
        resolve: (obj) => {
          const { source } = obj;
          const { contents } = source;
          return contents;
        }
      }
    }
    }
});
