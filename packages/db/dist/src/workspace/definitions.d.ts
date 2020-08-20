import { Definitions } from "./pouch";
export declare type WorkspaceCollections = {
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
export declare const definitions: Definitions<WorkspaceCollections>;
