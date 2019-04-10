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
        extend type ContractConstructor {
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
      contractConstructor(id: ID!): ContractConstructor
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

    input ContractSourceInput {
      id: ID!
    }

    input ContractInput {
      name: String
      source: ContractSourceInput!
    }

    input ContractsAddInput {
      contracts: [ContractInput!]!
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

    input CompilationSourceContractSourceInput {
      id: ID!
    }

    input CompilationSourceContractAstInput {
      json: String!
    }

    input CompilationSourceContractInput {
      name: String
      source: CompilationSourceContractSourceInput
      ast: CompilationSourceContractAstInput
    }

    input CompilationInput {
      compiler: CompilerInput!
      contracts: [CompilationSourceContractInput!]
      sources: [CompilationSourceInput!]!
    }
    input CompilationsAddInput {
      compilations: [CompilationInput!]!
    }
    type CompilationsAddPayload {
      compilations: [Compilation!]
    }

    input ContractConstructorBytecodeInput {
      id: ID!
    }

    input ContractConstructorCompilationInput {
      id: ID!
    }

    input LinkReferenceInput {
      offsets: [ByteOffset!]
      length: Int!
    }

    input LinkValueInput {
      linkReference: LinkReferenceInput!
      value: Bytes!
    }

    input AbiInput {
      json: String!
      items: [String]
    }

    input ContractConstructorContractInput {
      id: ID!
    }

    input ContractConstructorInput {
      abi: AbiInput
      createBytecode: ContractConstructorBytecodeInput!
      compilation: ContractConstructorCompilationInput
      linkValues: [LinkValueInput]
      contract: ContractConstructorContractInput
    }

    input ContractConstructorsAddInput {
      contractConstructors: [ContractConstructorInput!]
    }

    type ContractConstructorsAddPayload {
      contractConstructors: [ContractConstructor!]
    }

    type Mutation {
      sourcesAdd(input: SourcesAddInput!): SourcesAddPayload
      bytecodesAdd(input: BytecodesAddInput!): BytecodesAddPayload
      contractsAdd(input: ContractsAddInput!): ContractsAddPayload
      compilationsAdd(input: CompilationsAddInput!): CompilationsAddPayload
      contractsAdd(input: ContractsAddInput!): ContractsAddPayload
      contractConstructorsAdd(input: ContractConstructorsAddInput!): ContractConstructorsAddPayload
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
      },
      contractConstructor: {
        resolve: (_, { id }, { workspace }) =>
          workspace.contractConstructor({ id })
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
      }, 
      contractConstructorsAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.contractConstructorsAdd({ input })
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
    Contract: {
      source: {
        resolve: ({ source }, _, { workspace }) => 
          workspace.source(source)
      }
    },
    SourceContract: {
      source: {
        resolve: ({ source }, _, { workspace }) =>
            workspace.source(source)
      },
    },
    ContractConstructor: {
      createBytecode: {
        resolve: ({ createBytecode }, _, { workspace }) => 
          workspace.bytecode(createBytecode)
      }, 
      compilation: {
        resolve: ({ compilation }, _, { workspace }) => 
          workspace.compilation(compilation)
      },
      contract: {
        resolve: ({ contract }, _, { workspace }) => 
          workspace.contract(contract)
      } 
    },  
  }
});
