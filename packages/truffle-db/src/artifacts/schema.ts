import {
  mergeSchemas,
  transformSchema,
  FilterRootFields
} from "graphql-tools";

import { schema as rootSchema } from "truffle-db/schema";
import { schema as jsonSchema } from "./json";

export const schema = mergeSchemas({
  schemas: [
    rootSchema,
    transformSchema(jsonSchema, [
      new FilterRootFields( (_, rootField) => rootField !== "contract"),
      new FilterRootFields( (_, rootField) => rootField !== "contractNames"),
    ]),
    `type Query {
      contractNames: [String]!
      contractType(name: String!): ContractType
      contractInstance(networkId: String!, name: String!): ContractInstance
    }`
  ],
  resolvers: {
    Query: {
      contractNames: {
        resolve: (_, args, context, info) => info.mergeInfo.delegateToSchema({
          schema: jsonSchema,
          operation: "query",
          fieldName: "contractNames",
          args,
          context,
          info
        })
      },
      contractType: {
        resolve: (_, args, context, info) => info.mergeInfo.delegateToSchema({
          schema: jsonSchema,
          operation: "query",
          fieldName: "contract",
          args,
          context,
          info,
        })
      },

      contractInstance: {
        resolve: (_, args, context, info) => info.mergeInfo.delegateToSchema({
          schema: jsonSchema,
          operation: "query",
          fieldName: "contract",
          args,
          context,
          info,
        })
      }
    },

    ContractInstance: {
      address: {
        fragment: `... on ContractObject {
          networks {
            networkObject {
              address
            }
          }
        }`,
        resolve: (obj) => {
          const { networks } = obj;
          const result = networks
            .map(
              ({ networkObject: { address } }) => address
            )[0];

          return result;
        }
      },
      callBytecode: {
        fragment: `... on ContractObject {
          deployedSourceMap,
          deployedBytecode
        }`,
        resolve: ({
          deployedBytecode: bytes,
          deployedSourceMap: sourceMap
        }) => ({ bytes, sourceMap })
      },
      contractType: {
        fragment: `... on ContractObject {
          name: contractName
        }`,
        resolve: (obj, {}, context, info) => info.mergeInfo.delegateToSchema({
          schema: jsonSchema,
          operation: "query",
          fieldName: "contract",
          args: {
            name: obj.name
          },
          context,
          info,
        })
      }
    },

    ContractType: {
      name: {
        fragment: "... on ContractObject { name: contractName }"
      },

      createBytecode: {
        fragment: "... on ContractObject { sourceMap, bytecode }",
        resolve: ({ bytecode: bytes, sourceMap }) => ({ bytes, sourceMap })
      }
    },
  }
});
