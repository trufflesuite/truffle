import {
  mergeSchemas,
} from "graphql-tools";

import { schema as rootSchema } from "truffle-db/schema";

export const schema = mergeSchemas({
  schemas: [
    rootSchema,
    `type Query {
      contractNames: [String]!
    }
    type Mutation {
      addContractName(name: String!): String!
    }`
  ],
  resolvers: {
    Query: {
      contractNames: {
        resolve: (_, {}, { workspace }) =>
          workspace.contractNames()
      }
    },
    Mutation: {
      addContractName: {
        resolve: (_, { name }, { workspace }) =>
          workspace.addContractName(name)
      }
    }
  }
});
