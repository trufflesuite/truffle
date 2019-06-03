import {
  mergeSchemas,
} from "@gnd/graphql-tools";

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
        extend type ContractInstance {
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
      contractInstance(id: ID!): ContractInstance
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

    input AbiInput {
      json: String!
      items: [String]
    }

    input ContractCompilationInput {
      id: ID!
    }

    input ContractSourceContractInput {
      index: FileIndex
    }

    input ContractConstructorBytecodeInput {
      id: ID!
    }

    input ContractConstructorInput {
      createBytecode: ContractConstructorBytecodeInput!
    }

    input ContractInput {
      name: String
      abi: AbiInput
      compilation: ContractCompilationInput
      sourceContract: ContractSourceContractInput
      constructor: ContractConstructorInput
    }

    input ContractsAddInput {
      contracts: [ContractInput!]!
    }

    type ContractsAddPayload {
      contracts: [Contract]!
    }

    input CompilerInput {
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

    input LinkReferenceInput {
      offsets: [ByteOffset!]
      length: Int!
    }

    input LinkValueInput {
      linkReference: LinkReferenceInput!
      value: Bytes!
    }
    type ContractInstancesAddPayload {
      contractInstances: [ContractInstance!]!
    }

    input ContractInstanceAddressInput {
      address: Address!
    }

    input ContractInstanceNetworkInput {
      name: String
      networkID: NetworkID!
    }

    input ContractInstanceInput {
      address: ContractInstanceAddressInput!
      network: ContractInstanceNetworkInput!
      contract: ContractInput
    }

    input ContractInstancesAddInput {
      contractInstances: [ContractInstanceInput!]!
    }

    type Mutation {
      sourcesAdd(input: SourcesAddInput!): SourcesAddPayload
      bytecodesAdd(input: BytecodesAddInput!): BytecodesAddPayload
      contractsAdd(input: ContractsAddInput!): ContractsAddPayload
      compilationsAdd(input: CompilationsAddInput!): CompilationsAddPayload
      contractInstancesAdd(input: ContractInstancesAddInput!): ContractInstancesAddPayload
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
      contractInstance: {
        resolve: (_, { id }, { workspace }) =>
          workspace.contractInstance({ id })
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
      contractInstancesAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.contractInstancesAdd({ input })
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
      compilation: {
        resolve: ({ compilation }, _, { workspace }) =>
          workspace.compilation(compilation)
      },
      sourceContract: {
        fragment: `... on Contract { compilation { id } }`,
        resolve: async ({ sourceContract, compilation }, _, { workspace }) => {
          const { contracts: sourceContracts } =
            await workspace.compilation(compilation);

          return sourceContracts[sourceContract.index];
        }
      }
    },
    SourceContract: {
      source: {
        resolve: ({ source }, _, { workspace }) =>
            workspace.source(source)
      },
    },
    Constructor: {
      createBytecode: {
        resolve: ({ createBytecode }, _, { workspace }) =>
            workspace.bytecode(createBytecode)
      }
    }
  }
});
