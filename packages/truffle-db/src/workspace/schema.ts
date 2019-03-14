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
        extend type Contract {
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
      contract(id: ID!): Contract
      compilation(id: ID!): Compilation
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

    input contractSourceInput {
      id: ID!
    }

    input contractInput {
      name: String
      source: contractSourceInput!
    }

    input ContractsAddInput {
      contracts: [contractInput!]!
    }

    type ContractsAddPayload {
      contracts: [Contract]!
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

    input CompilationContractInput {
      id: ID!
    }

    input CompilationInput {
      compiler: CompilerInput!
      contracts: [CompilationContractInput!]
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
      contractsAdd(input:ContractsAddInput!):ContractsAddPayload
      compilationsAdd(input: CompilationsAddInput!): CompilationsAddPayload
    } `
  ],
  resolvers: {
    Query: {
      contractNames: {
        resolve: (_, {}, { workspace }) =>
          workspace.contractNames()
      },
      contract: {
        resolve: (_, { id }, { workspace }) =>
          workspace.contract({ id })
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
      contractsAdd: {
        resolve: (_, {input}, {workspace}) => 
        workspace.contractsAdd({ input })
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
      },
      contracts: {
        resolve: ({ contracts }, _, { workspace }) =>
          Promise.all(
            contracts.map(contract => workspace.contract(contract))
          )
      }
    },
    Contract: {
      source: {
        resolve: ({ source }, _, { workspace }) => 
          workspace.source(source)
      }
    },
  }
});
