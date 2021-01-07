import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:types");

import * as Meta from "@truffle/db/meta";
import * as Pouch from "@truffle/db/pouch";

export { Db, IdObject, toIdObject } from "@truffle/db/meta";

export type Collections = {
  sources: {
    resource: DataModel.Source;
    input: DataModel.SourceInput;
    names: {
      resource: "source";
      Resource: "Source";
      resources: "sources";
      Resources: "Sources";
      resourcesMutate: "sourcesAdd";
      ResourcesMutate: "SourcesAdd";
    };
  };
  bytecodes: {
    resource: DataModel.Bytecode;
    input: DataModel.BytecodeInput;
    names: {
      resource: "bytecode";
      Resource: "Bytecode";
      resources: "bytecodes";
      Resources: "Bytecodes";
      resourcesMutate: "bytecodesAdd";
      ResourcesMutate: "BytecodesAdd";
    };
  };
  compilations: {
    resource: DataModel.Compilation;
    input: DataModel.CompilationInput;
    names: {
      resource: "compilation";
      Resource: "Compilation";
      resources: "compilations";
      Resources: "Compilations";
      resourcesMutate: "compilationsAdd";
      ResourcesMutate: "CompilationsAdd";
    };
  };
  contractInstances: {
    resource: DataModel.ContractInstance;
    input: DataModel.ContractInstanceInput;
    names: {
      resource: "contractInstance";
      Resource: "ContractInstance";
      resources: "contractInstances";
      Resources: "ContractInstances";
      resourcesMutate: "contractInstancesAdd";
      ResourcesMutate: "ContractInstancesAdd";
    };
  };
  contracts: {
    resource: DataModel.Contract;
    input: DataModel.ContractInput;
    named: true;
    names: {
      resource: "contract";
      Resource: "Contract";
      resources: "contracts";
      Resources: "Contracts";
      resourcesMutate: "contractsAdd";
      ResourcesMutate: "ContractsAdd";
    };
  };
  nameRecords: {
    resource: DataModel.NameRecord;
    input: DataModel.NameRecordInput;
    names: {
      resource: "nameRecord";
      Resource: "NameRecord";
      resources: "nameRecords";
      Resources: "NameRecords";
      resourcesMutate: "nameRecordsAdd";
      ResourcesMutate: "NameRecordsAdd";
    };
  };
  networks: {
    resource: DataModel.Network;
    input: DataModel.NetworkInput;
    named: true;
    names: {
      resource: "network";
      Resource: "Network";
      resources: "networks";
      Resources: "Networks";
      resourcesMutate: "networksAdd";
      ResourcesMutate: "NetworksAdd";
    };
  };
  projects: {
    resource: DataModel.Project;
    input: DataModel.ProjectInput;
    names: {
      resource: "project";
      Resource: "Project";
      resources: "projects";
      Resources: "Projects";
      resourcesMutate: "projectsAdd";
      ResourcesMutate: "ProjectsAdd";
    };
  };
  projectNames: {
    resource: DataModel.ProjectName;
    input: DataModel.ProjectNameInput;
    mutable: true;
    names: {
      resource: "projectName";
      Resource: "ProjectName";
      resources: "projectNames";
      Resources: "ProjectNames";
      resourcesMutate: "projectNamesAssign";
      ResourcesMutate: "ProjectNamesAssign";
    };
  };
  networkGenealogies: {
    resource: DataModel.NetworkGenealogy;
    input: DataModel.NetworkGenealogyInput;
    names: {
      resource: "networkGenealogy";
      Resource: "NetworkGenealogy";
      resources: "networkGenealogies";
      Resources: "NetworkGenealogies";
      resourcesMutate: "networkGenealogiesAdd";
      ResourcesMutate: "NetworkGenealogiesAdd";
    };
  };
};

export type CollectionName = Meta.CollectionName<Collections>;

export type Definitions = {
  [N in CollectionName]: Pouch.Definition<Collections, N> &
    Meta.Definition<Collections, N>;
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

export type NamedCollectionName = Meta.NamedCollectionName<Collections>;

export type Workspace = Meta.Workspace<Collections>;
