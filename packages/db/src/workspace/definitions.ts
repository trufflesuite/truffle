import * as Pouch from "./pouch";

export type Collections = {
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
    named: true;
  };
  nameRecords: {
    resource: DataModel.INameRecord;
    input: DataModel.INameRecordsAddInput;
  };
  networks: {
    resource: DataModel.INetwork;
    input: DataModel.INetworksAddInput;
    named: true;
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

export type Definitions = Pouch.Definitions<Collections>;

export type CollectionName<
  F extends Pouch.CollectionFilter<Collections> | undefined = undefined
> = Pouch.CollectionName<Collections, F>;

export type MutableCollectionName = Pouch.MutableCollectionName<Collections>;

export type NamedCollectionName = Pouch.NamedCollectionName<Collections>;

export type Resource<
  N extends CollectionName = CollectionName
> = Pouch.Resource<Collections, N>;

export type MutableResource<
  N extends MutableCollectionName = MutableCollectionName
> = Pouch.MutableResource<Collections, N>;

export type NamedResource<
  N extends NamedCollectionName = NamedCollectionName
> = Pouch.NamedResource<Collections, N>;

export const definitions: Definitions = {
  contracts: {
    createIndexes: [
      {
        fields: ["compilation.id", "processedSource.index"]
      }
    ],
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
