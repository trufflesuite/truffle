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
      source(id: ID!): Source
      bytecode(id: ID!): Bytecode
    }

    input SourceInput {
      contents: String!
      sourcePath: String
    }

    input SourcesAddInput {
      sources: [SourceInput!]!
    }

    type SourcesAddPayload {
      sources: [Source!]
    }

    input BytecodeInput {
      bytes: Bytes!
    }

    input BytecodesAddInput {
      bytecodes: [BytecodeInput!]!
    }

    type BytecodesAddPayload {
      bytecodes: [Bytecode!]
    }

    input contractTypeInput {
      abi: String
      name: String
      compilation: Object
      createBytecode: BytecodeInput
    }

    input ContractTypesAddInput {
      contractType: [contractTypeInput!]!
    }

    type ContractTypesAddPayload {
      contractType: [ContractType!]
    }

    type Mutation {
      sourcesAdd(input: SourcesAddInput!): SourcesAddPayload
      bytecodesAdd(input: BytecodesAddInput!): BytecodesAddPayload
      contractTypesAdd(input:ContractTypesAddInput!):ContractTypesAddPayload
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
      sourcesAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.sourcesAdd({ input })
      },
      bytecodesAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.bytecodesAdd({ input })
      },
      contractTypesAdd: {
        resolve: (_, {input}, {workspace}) => 
        workspace.contractTypesAdd({input})
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
