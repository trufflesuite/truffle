import { Definitions } from "./pouch";

export type WorkspaceCollections = {
  bytecodes: {
    resource: DataModel.IBytecode;
    input: DataModel.IBytecodesAddInput;
  };
  compilations: {
    resource: DataModel.ICompilation;
    input: DataModel.ICompilationsAddInput;
  };
  contractInstances: {
    resource: DataModel.IContractInstance;
    input: DataModel.IContractInstancesAddInput;
  };
  contracts: {
    resource: DataModel.IContract;
    input: DataModel.IContractsAddInput;
  };
  nameRecords: {
    resource: DataModel.INameRecord;
    input: DataModel.INameRecordsAddInput;
  };
  networks: {
    resource: DataModel.INetwork;
    input: DataModel.INetworksAddInput;
  };
  sources: {
    resource: DataModel.ISource;
    input: DataModel.ISourcesAddInput;
  };
};

export const definitions: Definitions<WorkspaceCollections> = {
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
  },
  nameRecords: {
    createIndexes: [{ fields: ["id"] }],
    idFields: ["name", "type", "resource", "previous"]
  }
};
