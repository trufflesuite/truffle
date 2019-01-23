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
      contractType(name: String!): ContractType
      source(id: String!): Source
      bytecode(id: String!): Bytecode
    }

    input AddSourceInput {
      contents: String!
      sourcePath: String
    }

    type AddSourcePayload {
      source: Source
    }

    input AddBytecodeInput {
      bytes: Bytes!
    }

    type AddBytecodePayload {
      bytecode: Bytecode
    }

    type Mutation {
      addSource(input: AddSourceInput!): AddSourcePayload
      addBytecode(input: AddBytecodeInput!): AddBytecodePayload
    } `
  ],
  resolvers: {
    Query: {
      contractNames: {
        resolve: (_, {}, { workspace }) =>
          workspace.contractNames()
      },
      contractType: {
        resolve: (_, { name }, { workspace }) =>
          workspace.contractType({ name })
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
      addSource: {
        resolve: (_, { input }, { workspace }) =>
          workspace.addSource({ input })
      },
      addBytecode: {
        resolve: (_, { input }, { workspace }) =>
          workspace.addBytecode({ input })
      }
    },
    ContractType: {
      createBytecode: {
        resolve: ({ createBytecode }, _, { workspace }) =>
          workspace.bytecode(createBytecode)
      }
    }
  }
});
