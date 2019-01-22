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
        rootSchema, `
        extend type Source {
          id: ID!
        }
        extend type Bytecode {
          id: ID!
        }
        `,
      ]
    }),

    // define entrypoints
    `type Query {
      contractNames: [String]!
      source(id: String!): Source
      bytecode(id: String!): Bytecode
    }

    type Mutation {
      addContractName(name: String!): String!
      addSource(contents: String!, sourcePath: String, ast: AST): ID!
      addBytecode(bytes: Bytes!): ID!
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
      },
      bytecode: {
        resolve: (_, { id }, { workspace }) =>
          workspace.bytecode({ id })
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
      },
      addBytecode: {
        resolve: (_, { bytes }, { workspace }) =>
          workspace.addBytecode({ bytes })
      }

    }
  }
});
