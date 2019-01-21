import {
  mergeSchemas,
  transformSchema,
  FilterRootFields
} from "graphql-tools";


import { schema as artifactsSchema } from "truffle-db/artifacts";

const scopedSchema = transformSchema(artifactsSchema, [
  new FilterRootFields( () => false ),
]);

export const schema = mergeSchemas({
  schemas: [
    scopedSchema,
    `type Query {
      artifacts: Artifacts!
    }
    type Artifacts {
      contractNames: [String]!
      contractType(name: String!): ContractType
      contractInstance(networkId: String!, name: String!): ContractInstance
    }`,
  ],

  resolvers: {
    Query: {
      artifacts: {
        resolve: () => true
      }
    },

    Artifacts: Object.assign(
      {}, ...["contractNames", "contractType", "contractInstance"].map(
        (fieldName) => ({
          [fieldName]: {
            resolve: (_, args, context, info) => info.mergeInfo.delegateToSchema({
              schema: artifactsSchema,
              operation: "query",
              fieldName,
              args,
              context,
              info
            })
          }
        })
      )
    )
  }
})
