export const definitions = {
  contracts: {
    createIndexes: [],
    idFields: ["name", "abi", "sourceContract", "compilation"]
  },
  sources: {
    createIndexes: [{ fields: ["contents"] }, { fields: ["sourcePath"] }],
    idFields: ["contents", "sourcePath"]
  },
  compilations: {
    createIndexes: [],
    idFields: ["compiler", "sources"]
  },
  bytecodes: {
    createIndexes: [],
    idFields: ["bytes", "linkReferences"]
  },
  networks: {
    createIndexes: [{ fields: ["id"] }],
    idFields: ["networkId", "historicBlock"]
  },
  contractInstances: {
    createIndexes: [],
    idFields: ["address", "network"]
  }
};
