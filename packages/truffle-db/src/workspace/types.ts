import { Databases } from "./pouch";

type CollectionName =
  | "bytecodes"
  | "compilations"
  | "contractInstances"
  | "contracts"
  | "networks"
  | "sources";

type MutationName =
  | "bytecodesAdd"
  | "compilationsAdd"
  | "contractInstancesAdd"
  | "contractsAdd"
  | "networksAdd"
  | "sourcesAdd";

type CollectionResourceMapping = {
  bytecodes: "bytecode";
  compilations: "compilation";
  contractInstances: "contractInstance";
  contracts: "contract";
  networks: "network";
  sources: "source";
};

type CollectionMutationMapping = {
  bytecodes: {
    mutation: "bytecodesAdd";
    input: DataModel.IBytecodesAddInput;
  };
  compilations: {
    mutation: "compilationsAdd";
    input: DataModel.ICompilationsAddInput;
  };
  contractInstances: {
    mutation: "contractInstancesAdd";
    input: DataModel.IContractInstancesAddInput;
  };
  contracts: {
    mutation: "contractsAdd";
    input: DataModel.IContractsAddInput;
  };
  networks: {
    mutation: "networksAdd";
    input: DataModel.INetworksAddInput;
  };
  sources: {
    mutation: "sourcesAdd";
    input: DataModel.ISourcesAddInput;
  };
};

type CollectionQuery = Pick<DataModel.IWorkspaceQuery, CollectionName>;
type ResourceQuery = Pick<
  DataModel.IWorkspaceQuery,
  CollectionResourceMapping[CollectionName]
>;
type Mutation = Pick<DataModel.IWorkspaceMutation, MutationName>;

export type WorkspaceDatabases = Databases<
  ResourceQuery,
  CollectionQuery,
  Mutation,
  CollectionResourceMapping,
  CollectionMutationMapping
>;
