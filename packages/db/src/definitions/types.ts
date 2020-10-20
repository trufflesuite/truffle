import * as Meta from "@truffle/db/meta";
import * as Pouch from "../pouch";
import * as GraphQl from "../graphql";

export type Collections = {
  sources: {
    resource: DataModel.ISource;
    input: DataModel.ISourceInput;
  };
  bytecodes: {
    resource: DataModel.IBytecode;
    input: DataModel.IBytecodeInput;
  };
  compilations: {
    resource: DataModel.ICompilation;
    input: DataModel.ICompilationInput;
  };
  contractInstances: {
    resource: DataModel.IContractInstance;
    input: DataModel.IContractInstanceInput;
  };
  contracts: {
    resource: DataModel.IContract;
    input: DataModel.IContractInput;
    named: true;
  };
  nameRecords: {
    resource: DataModel.INameRecord;
    input: DataModel.INameRecordInput;
  };
  networks: {
    resource: DataModel.INetwork;
    input: DataModel.INetworkInput;
    named: true;
  };
  projects: {
    resource: DataModel.IProject;
    input: DataModel.IProjectInput;
  };
  projectNames: {
    resource: DataModel.IProjectName;
    input: DataModel.IProjectNameInput;
    mutable: true;
  };
};

export type CollectionName = Meta.CollectionName<Collections>;

export type Definitions = {
  [N in CollectionName]: Pouch.Definition<Collections, N> &
    GraphQl.Definition<Collections, N>;
};

export type Definition<N extends CollectionName> = Definitions[N];

export type Resource<N extends CollectionName = CollectionName> = Meta.Resource<
  Collections,
  N
>;

export type MutableResource<
  N extends CollectionName = CollectionName
> = Meta.MutableResource<Collections, N>;

export type NamedResource<
  N extends CollectionName = CollectionName
> = Meta.NamedResource<Collections, N>;

export type Databases = Pouch.Databases<Collections>;

export type Context = GraphQl.Context<Collections>;
