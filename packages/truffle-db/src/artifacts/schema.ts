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
      contract(name: String!): Contract
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
      contract: {
        resolve: (_, args, context, info) => info.mergeInfo.delegateToSchema({
          schema: jsonSchema,
          operation: "query",
          fieldName: "contract",
          args,
          context,
          info
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
      
    },

    Contract: {
      name: {
        fragment: "... on ContractObject { name: contractName }"
      }, 
      sourceContract: {
        fragment: 
        `... on ContractObject { 
          ast,
          source { contents, sourcePath }
        }`,
        resolve: (obj) => {
          const { name, source, ast } = obj;
          const sourceContract = {
            name: name, 
            source: source, 
            ast: ast
          }
          return sourceContract;
        }
      }, 
      contractConstructor: {
        fragment: `... on ContractObject {
            bytecode
          }`,
          resolve: (obj) => {
            const { bytecode } = obj;
            const contractConstructor = {
              createBytecode: {
                bytes: bytecode
              }
            }
            return contractConstructor; 
          }
        }
      },
    }
});
