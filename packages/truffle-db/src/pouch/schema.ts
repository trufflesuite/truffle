import {
  mergeSchemas,
} from "graphql-tools";

import { schema as rootSchema } from "truffle-db/schema";

export const schema = mergeSchemas({
  schemas: [
    // HACK github.com/apollographql/graphql-tools/issues/847
    // fix seems to require nesting mergeSchemas so extend works
    mergeSchemas({
      schemas: [
        rootSchema,
        `extend type Source {
          id: ID!
        }`,
      ]
    }),

    // define entrypoints
    `type Query {
      contractNames: [String]!
      source(id: String!): Source
    }

    type Mutation {
      addContractName(name: String!): String!
      addSource(contents: String!, sourcePath: String, ast: AST): ID!
    } `
  ],
  resolvers: {
    Query: {
      contractNames: {
        resolve: (_, {}, { workspace }) =>
          workspace.contractNames()
      },
      source: {
        resolve: (_, { id }, { workspace }) =>
          workspace.source({ id })
      }
    },
    Mutation: {
      addContractName: {
        resolve: (_, { name }, { workspace }) =>
          workspace.addContractName({ name })
      },
      addSource: {
        resolve: (_, { contents, sourcePath, ast }, { workspace }) =>
          workspace.addSource({ contents, sourcePath, ast })
      }
    }
  }
});
