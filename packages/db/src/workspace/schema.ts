import { mergeSchemas } from "@gnd/graphql-tools";

import { schema as rootSchema } from "@truffle/db/schema";

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
        extend type Project {
          id: ID!
        }
        extend interface Named {
          id: ID!
        }
        type ProjectName {
          project: Project!
          name: String!
          type: String!
          nameRecord: NameRecord!
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
      projects: [Project]

      source(id: ID!): Source
      bytecode(id: ID!): Bytecode
      contractInstance(id: ID!): ContractInstance
      network(id: ID!): Network
      nameRecord(id:ID!): NameRecord
      project(id: ID!): Project
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

    input BytecodeLinkReferenceInput {
      offsets: [Int!]!
      name: String
      length: Int!
    }

    input BytecodeInput {
      bytes: Bytes!
      linkReferences: [BytecodeLinkReferenceInput]
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

    input ContractProcessedSourceInput {
      index: FileIndex
    }

    input ContractBytecodeInput {
      id: ID!
    }

    input ContractInput {
      name: String!
      abi: AbiInput
      compilation: ContractCompilationInput
      processedSource: ContractProcessedSourceInput
      createBytecode: ContractBytecodeInput
      callBytecode: ContractBytecodeInput
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

    input CompilationProcessedSourceSourceInput {
      id: ID!
    }

    input CompilationProcessedSourceAstInput {
      json: String!
    }

    input CompilationProcessedSourceInput {
      name: String
      source: CompilationProcessedSourceSourceInput
      ast: CompilationProcessedSourceAstInput
    }

    input CompilationSourceMapInput {
      json: String!
    }

    input CompilationInput {
      compiler: CompilerInput!
      processedSources: [CompilationProcessedSourceInput!]
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
      bytecode: ID!
      index: FileIndex
    }

    input ContractInstanceLinkValueInput {
      value: Address!
      linkReference: LinkReferenceInput!
    }

    input ContractInstanceCreationConstructorLinkValueInput {
      value: Address!
      linkReference: LinkReferenceInput!
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

    input ContractInstanceCreationConstructorBytecodeIdInput {
      id: ID!
    }

    input ContractInstanceCreationConstructorBytecodeInput {
      bytecode: ContractInstanceCreationConstructorBytecodeIdInput
      linkValues: [ContractInstanceCreationConstructorLinkValueInput]
    }

    input ContractInstanceCreationConstructorInput {
      createBytecode: ContractInstanceCreationConstructorBytecodeInput!
    }

    input ContractInstanceCreationInput {
      transactionHash: TransactionHash!
      constructor: ContractInstanceCreationConstructorInput!
    }

    input ContractInstanceLinkedBytecodeInput {
      bytecode: ContractInstanceBytecodeInput!
      linkValues: [ContractInstanceLinkValueInput]
    }

    input ContractInstanceInput {
      address: Address!
      network: ContractInstanceNetworkInput
      creation: ContractInstanceCreationInput
      contract: ContractInstanceContractInput
      callBytecode: ContractInstanceLinkedBytecodeInput
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
    }

    input PreviousNameRecordInput {
      id: ID!
    }

    input NameRecordInput {
      name: String!
      type: String!
      resource: ResourceInput!
      previous: PreviousNameRecordInput
    }

    input NameRecordsAddInput {
      nameRecords: [NameRecordInput!]!
    }

    type NameRecordsAddPayload {
      nameRecords: [NameRecord]
    }

    input ProjectInput {
      directory: String!
    }

    input ProjectsAddInput {
      projects: [ProjectInput!]!
    }

    type ProjectsAddPayload {
      projects: [Project!]!
    }

    input ProjectNameInput {
      project: ResourceInput!
      name: String!
      type: String!
      nameRecord: ResourceInput!
    }

    input ProjectNamesAssignInput {
      projectNames: [ProjectNameInput!]!
    }

    type ProjectNamesAssignPayload {
      projectNames: [ProjectName!]!
    }

    type Mutation {
      sourcesAdd(input: SourcesAddInput!): SourcesAddPayload
      bytecodesAdd(input: BytecodesAddInput!): BytecodesAddPayload
      contractsAdd(input: ContractsAddInput!): ContractsAddPayload
      compilationsAdd(input: CompilationsAddInput!): CompilationsAddPayload
      contractInstancesAdd(input: ContractInstancesAddInput!): ContractInstancesAddPayload
      networksAdd(input: NetworksAddInput!): NetworksAddPayload
      nameRecordsAdd(input: NameRecordsAddInput!): NameRecordsAddPayload
      projectsAdd(input:ProjectsAddInput!):ProjectsAddPayload
      projectNamesAssign(input: ProjectNamesAssignInput): ProjectNamesAssignPayload
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
        resolve: (_, {}, { workspace }) => workspace.nameRecords()
      },
      project: {
        resolve: (_, { id }, { workspace }) => workspace.project({ id })
      },
      projects: {
        resolve: (_, { id }, { workspace }) => workspace.projects()
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
      },
      projectsAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.projectsAdd({ input })
      },
      projectNamesAssign: {
        resolve: (_, { input }, { workspace }) => {
          return workspace.projectNamesAssign({ input });
        }
      }
    },
    Named: {
      __resolveType: obj => {
        if (obj.networkId) {
          return "Network";
        } else if (obj.abi) {
          return "Contract";
        } else {
          return null;
        }
      }
    },
    NameRecord: {
      resource: {
        resolve: async ({ type, resource: { id } }, _, { workspace }) => {
          switch (type) {
            case "Contract":
              return await workspace.contract({ id });
            case "Network":
              return await workspace.network({ id });
            default:
              return null;
          }
        }
      },
      previous: {
        resolve: ({ id }, _, { workspace }) => workspace.nameRecord({ id })
      }
    },
    Project: {
      resolve: {
        resolve: async ({ id }, { name, type }, { workspace }) => {
          return await workspace.projectNames({
            project: { id },
            name,
            type
          });
        }
      },
      network: {
        resolve: async ({ id }, { name }, { workspace }) => {
          const nameRecords = await workspace.projectNames({
            project: { id },
            type: "Network",
            name
          });
          if (nameRecords.length === 0) {
            return;
          }
          const { resource } = nameRecords[0];
          return await workspace.network(resource);
        }
      },
      contract: {
        resolve: async ({ id }, { name }, { workspace }) => {
          const nameRecords = await workspace.projectNames({
            project: { id },
            type: "Contract",
            name
          });
          if (nameRecords.length === 0) {
            return;
          }
          const { resource } = nameRecords[0];
          return await workspace.contract(resource);
        }
      }
    },
    ProjectName: {
      project: {
        resolve: ({ project: { id } }, _, { workspace }) =>
          workspace.project({ id })
      },
      nameRecord: {
        resolve: ({ nameRecord: { id } }, _, { workspace }) =>
          workspace.nameRecord({ id })
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
      processedSource: {
        fragment: `... on Contract { compilation { id } }`,
        resolve: async ({ processedSource, compilation }, _, { workspace }) => {
          const { processedSources } = await workspace.compilation(compilation);

          return processedSources[processedSource.index];
        }
      },
      createBytecode: {
        resolve: ({ createBytecode }, _, { workspace }) =>
          workspace.bytecode(createBytecode)
      },
      callBytecode: {
        resolve: ({ callBytecode }, _, { workspace }) =>
          workspace.bytecode(callBytecode)
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
        resolve: async ({ callBytecode }, _, { workspace }) => {
          let bytecode = await workspace.bytecode(callBytecode.bytecode);
          let linkValues = callBytecode.linkValues.map(
            ({ value, linkReference }) => {
              return {
                value: value,
                linkReference: bytecode.linkReferences[linkReference.index]
              };
            }
          );
          return {
            bytecode: bytecode,
            linkValues: linkValues
          };
        }
      },
      creation: {
        resolve: async (input, _, { workspace }) => {
          let bytecode = await workspace.bytecode(
            input.creation.constructor.createBytecode.bytecode
          );
          let transactionHash = input.creation.transactionHash;
          let linkValues = input.creation.constructor.createBytecode.linkValues.map(
            ({ value, linkReference }) => {
              return {
                value: value,
                linkReference: bytecode.linkReferences[linkReference.index]
              };
            }
          );
          return {
            transactionHash: transactionHash,
            constructor: {
              createBytecode: {
                bytecode: bytecode,
                linkValues: linkValues
              }
            }
          };
        }
      }
    },
    ProcessedSource: {
      source: {
        resolve: ({ source }, _, { workspace }) => workspace.source(source)
      }
    }
  }
});
