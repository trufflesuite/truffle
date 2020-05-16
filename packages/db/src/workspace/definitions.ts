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
  projects: {
    resource: DataModel.IProject;
    input: DataModel.IProjectsAddInput;
  };
  projectNames: {
    resource: DataModel.IProjectName;
    input: DataModel.IProjectNameInput;
    mutable: true;
  };
};

export const definitions: Definitions<WorkspaceCollections> = {
  contracts: {
    createIndexes: [],
    idFields: ["name", "abi", "processedSource", "compilation"]
  },
  sources: {
    createIndexes: [],
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
    createIndexes: [],
    idFields: ["networkId", "historicBlock"]
  },
  contractInstances: {
    createIndexes: [],
    idFields: ["address", "network"]
  },
  nameRecords: {
    createIndexes: [],
    idFields: ["name", "type", "resource", "previous"]
  },
  projects: {
    createIndexes: [],
    idFields: ["directory"]
  },
  projectNames: {
    createIndexes: [
      {
        fields: ["project.id"]
      },
      {
        fields: ["project.id", "type"]
      },
      {
        fields: ["project.id", "name", "type"]
      }
    ],
    idFields: ["project", "name", "type"]
  }
};
