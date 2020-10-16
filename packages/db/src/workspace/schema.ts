import { makeExecutableSchema } from "@gnd/graphql-tools";

import { schema as rootSchema } from "@truffle/db/schema";

export const schema = makeExecutableSchema({
  typeDefs: [rootSchema],

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
        resolve: (_, {}, { workspace }) => workspace.projects()
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
      },
      processedSources: {
        resolve: ({ id, processedSources }, _, {}) =>
          processedSources.map((processedSource, index) => ({
            ...processedSource,
            compilation: { id },
            index
          }))
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
      },
      contracts: {
        resolve: ({ compilation, index }, _, { workspace }) =>
          workspace.databases.find("contracts", {
            selector: {
              "compilation.id": compilation.id,
              "processedSource.index": index
            }
          })
      }
    }
  }
});
