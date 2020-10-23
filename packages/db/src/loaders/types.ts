import * as graphql from "graphql";

import { CompiledContract } from "@truffle/compile-common";
import { IdObject } from "@truffle/db/meta";

export interface CompilationData {
  compiler: {
    name: string;
    version: string;
  };
  sources: SourceData[]; // ordered by index
}

export interface SourceData {
  index: number;
  input: DataModel.SourceInput;
  contracts: CompiledContract[];
}

export interface LoadedSources {
  [sourcePath: string]: IdObject<DataModel.Source>;
}

// we track loaded bytecodes using the same structure as CompilationData:
// - order sources
// - order contracts for each source
// - capture bytecodes for each contract
export interface LoadedBytecodes {
  sources: {
    contracts: {
      createBytecode: IdObject<DataModel.Bytecode>;
      callBytecode: IdObject<DataModel.Bytecode>;
    }[];
  }[];
}

export interface WorkspaceRequest {
  request: string | graphql.DocumentNode; // GraphQL request
  variables: {
    [name: string]: any;
  };
}

export type WorkspaceResponse<N extends string = string, R = any> = {
  data: {
    [RequestName in N]: R;
  };
};
