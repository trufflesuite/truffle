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
        extend type Compilation {
          id: ID!
        }
        `,
      ]
    }),

    // define entrypoints
    `type Query {
      contractNames: [String]!
      compilation(id: ID!): Compilation
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

    input CompilerInput {
      id: String
      name: String
      version: String
      settings: Object
    }

    input CompilationSourceInput {
      id: ID!
    }

    input CompilationInput {
      compiler: CompilerInput!
      contractTypes: Object
      sources: [CompilationSourceInput!]!
    }
    input CompilationsAddInput {
      compilations: [CompilationInput!]!
    }
    type CompilationsAddPayload {
      compilations: [Compilation!]
    }

    type Mutation {
      sourcesAdd(input: SourcesAddInput!): SourcesAddPayload
      bytecodesAdd(input: BytecodesAddInput!): BytecodesAddPayload
      compilationsAdd(input: CompilationsAddInput!): CompilationsAddPayload
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
      },
      compilation: {
        resolve: (_, { id }, { workspace }) =>
          workspace.compilation({ id })
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
      compilationsAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.compilationsAdd({ input })
      }
    },
    Compilation: {
      sources: {
        resolve: ({ sources }, _, { workspace }) =>
          Promise.all(
            sources.map(source => workspace.source(source))
          )
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
