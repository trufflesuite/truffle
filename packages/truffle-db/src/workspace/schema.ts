import { mergeSchemas } from "@gnd/graphql-tools";

import { schema as rootSchema } from "truffle-db/schema";

export const schema = mergeSchemas({
  schemas: [
    // HACK github.com/apollographql/graphql-tools/issues/847
    // fix seems to require nesting mergeSchemas so extend works
    mergeSchemas({
      schemas: [
        rootSchema,
        `
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
        extend type Network {
          id: ID!
        }
        extend type NameRecord {
          id: ID!
        }
        `
      ]
    }),

    // define entrypoints
    `type Query {
      contractNames: [String]!
      contract(id: ID!): Contract
      compilation(id: ID!): Compilation

      bytecodes: [Bytecode]
      compilations: [Compilation]
      contracts: [Contract]
      contractInstances: [ContractInstance]
      networks: [Network]
      sources: [Source]
      nameRecords: [NameRecord]

      source(id: ID!): Source
      bytecode(id: ID!): Bytecode
      contractInstance(id: ID!): ContractInstance
      network(id: ID!): Network
      nameRecord(id:ID!): NameRecord
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
      name: String!
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

    input CompilationSourceMapInput {
      json: String!
    }

    input CompilationInput {
      compiler: CompilerInput!
      contracts: [CompilationSourceContractInput!]
      sources: [CompilationSourceInput!]!
      sourceMaps: [CompilationSourceMapInput]
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
      id: ID!
    }

    input ContractInstanceBytecodeInput {
      id: ID!
    }

    input ContractInstanceContractInput {
      id: ID!
    }

    input ContractInstanceCreationConstructorBytecodeInput {
      id: ID!
    }

    input ContractInstanceCreationConstructorInput {
      createBytecode: ContractInstanceCreationConstructorBytecodeInput!
    }

    input ContractInstanceCreationInput {
      transactionHash: TransactionHash!
      constructor: ContractInstanceCreationConstructorInput!
    }

    input ContractInstanceInput {
      address: Address!
      network: ContractInstanceNetworkInput
      creation: ContractInstanceCreationInput
      contract: ContractInstanceContractInput
      callBytecode: ContractInstanceBytecodeInput
    }

    input ContractInstancesAddInput {
      contractInstances: [ContractInstanceInput!]!
    }

    type NetworksAddPayload {
      networks: [Network!]!
    }

    input HistoricBlockInput {
      height: Int!
      hash: String!
    }

    input NetworkInput {
      name: String!
      networkId: NetworkId!
      historicBlock: HistoricBlockInput!
    }

    input NetworksAddInput {
      networks: [NetworkInput!]!
    }

    input ResourceInput {
      id: ID!
      type: String!
    }

    input PreviousNameRecordInput {
      id: ID!
    }

    input NameRecordAddInput {
      name: String!
      resource: ResourceInput!
      previous: PreviousNameRecordInput
    }

    input NameRecordsAddInput {
      nameRecords: [NameRecordAddInput!]!
    }

    type NameRecordsAddPayload {
      nameRecords: [NameRecord]
    }

    type Mutation {
      sourcesAdd(input: SourcesAddInput!): SourcesAddPayload
      bytecodesAdd(input: BytecodesAddInput!): BytecodesAddPayload
      contractsAdd(input: ContractsAddInput!): ContractsAddPayload
      compilationsAdd(input: CompilationsAddInput!): CompilationsAddPayload
      contractInstancesAdd(input: ContractInstancesAddInput!): ContractInstancesAddPayload
      networksAdd(input: NetworksAddInput!): NetworksAddPayload
      nameRecordsAdd(input: NameRecordsAddInput!): NameRecordsAddPayload
    } `
  ],

  resolvers: {
    Query: {
      contractNames: {
        resolve: (_, {}, { workspace }) => workspace.contractNames()
      },
      contracts: {
        resolve: (_, {}, { workspace }) => workspace.contracts()
      },
      contract: {
        resolve: (_, { id }, { workspace }) => workspace.contract({ id })
      },
      sources: {
        resolve: (_, {}, { workspace }) => workspace.sources()
      },
      source: {
        resolve: (_, { id }, { workspace }) => workspace.source({ id })
      },
      bytecodes: {
        resolve: (_, {}, { workspace }) => workspace.bytecodes()
      },
      bytecode: {
        resolve: (_, { id }, { workspace }) => workspace.bytecode({ id })
      },
      compilations: {
        resolve: (_, {}, { workspace }) => workspace.compilations()
      },
      compilation: {
        resolve: (_, { id }, { workspace }) => workspace.compilation({ id })
      },
      contractInstances: {
        resolve: (_, {}, { workspace }) => workspace.contractInstances()
      },
      contractInstance: {
        resolve: (_, { id }, { workspace }) =>
          workspace.contractInstance({ id })
      },
      networks: {
        resolve: (_, {}, { workspace }) => workspace.networks()
      },
      network: {
        resolve: (_, { id }, { workspace }) => workspace.network({ id })
      },
      nameRecord: {
        resolve: (_, { id }, { workspace }) => workspace.nameRecord({ id })
      },
      nameRecords: {
        resolve: (_, { id }, { workspace }) => workspace.nameRecords()
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
        resolve: (_, { input }, { workspace }) =>
          workspace.contractsAdd({ input })
      },
      compilationsAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.compilationsAdd({ input })
      },
      contractInstancesAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.contractInstancesAdd({ input })
      },
      networksAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.networksAdd({ input })
      },
      nameRecordsAdd: {
        resolve: async (_, { input }, { workspace }) => {
          return await workspace.nameRecordsAdd({ input });
        }
      }
    },
    Named: {
      __resolveType: (obj, _, { workspace }) => {
        if (obj.networkId) {
          return "Network";
        } else {
          return "Contract";
        }
      }
    },
    NameRecord: {
      resource: {
        resolve: async (obj, _, { workspace }) => {
          if (obj.resource.type == "Network") {
            let network = await workspace.network({ id: obj.resource.id });
            return network;
          }
          if (obj.resource.type == "Contract") {
            let contract = await workspace.contract({ id: obj.resource.id });
            return contract;
          }
        }
      }
    },
    Compilation: {
      sources: {
        resolve: ({ sources }, _, { workspace }) =>
          Promise.all(sources.map(source => workspace.source(source)))
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
          const { contracts: sourceContracts } = await workspace.compilation(
            compilation
          );

          return sourceContracts[sourceContract.index];
        }
      }
    },
    ContractInstance: {
      network: {
        resolve: async ({ network }, _, { workspace }) =>
          await workspace.network(network)
      },
      contract: {
        resolve: ({ contract }, _, { workspace }) =>
          workspace.contract(contract)
      },
      callBytecode: {
        resolve: ({ callBytecode }, _, { workspace }) =>
          workspace.bytecode(callBytecode)
      },
      creation: {
        resolve: async (input, _, { workspace }) => {
          let bytecode = await workspace.bytecode(
            input.creation.constructor.createBytecode
          );
          let transactionHash = input.creation.transactionHash;
          return {
            transactionHash: transactionHash,
            constructor: { createBytecode: bytecode }
          };
        }
      }
    },
    SourceContract: {
      source: {
        resolve: ({ source }, _, { workspace }) => workspace.source(source)
      }
    },
    Constructor: {
      createBytecode: {
        resolve: ({ createBytecode }, _, { workspace }) =>
          workspace.bytecode(createBytecode)
      }
    }
  }
});
