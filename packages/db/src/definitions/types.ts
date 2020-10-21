import * as Meta from "@truffle/db/meta";
import * as Pouch from "../pouch";
import * as GraphQl from "../graphql";

export type Collections = {
  sources: {
    resource: DataModel.Source;
    input: DataModel.SourceInput;
  };
  bytecodes: {
    resource: DataModel.Bytecode;
    input: DataModel.BytecodeInput;
  };
  compilations: {
    resource: DataModel.Compilation;
    input: DataModel.CompilationInput;
  };
  contractInstances: {
    resource: DataModel.ContractInstance;
    input: DataModel.ContractInstanceInput;
  };
  contracts: {
    resource: DataModel.Contract;
    input: DataModel.ContractInput;
    named: true;
  };
  nameRecords: {
    resource: DataModel.NameRecord;
    input: DataModel.NameRecordInput;
  };
  networks: {
    resource: DataModel.Network;
    input: DataModel.NetworkInput;
    named: true;
  };
  projects: {
    resource: DataModel.Project;
    input: DataModel.ProjectInput;
  };
  projectNames: {
    resource: DataModel.ProjectName;
    input: DataModel.ProjectNameInput;
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

export type Workspace = Pouch.Workspace<Collections>;

export type Context = GraphQl.Context<Collections>;
