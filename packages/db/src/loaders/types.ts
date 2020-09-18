import { ContractObject } from "@truffle/contract-schema/spec";

// NOTE we do not use the regular ContractObject type here because
// @truffle/workflow-compile/new provides a different bytecode format than
// @truffle/contract-schema defines
export interface CompiledContract {
  contractName: string;
  abi: ContractObject["abi"];
  bytecode: DataModel.IBytecode;
  deployedBytecode: DataModel.IBytecode;
  sourceMap: string;
  deployedSourceMap: string;
  source: string;
  sourcePath: string;
  ast: object;
  compiler: {
    name: string;
    version: string;
  };
}

export interface CompilationData {
  compiler: {
    name: string;
    version: string;
  };
  sources: SourceData[]; // ordered by index
}

export interface SourceData {
  index: number;
  input: DataModel.ISourceInput;
  contracts: CompiledContract[];
}

export interface LoadedSources {
  [sourcePath: string]: IdObject<DataModel.ISource>;
}

// we track loaded bytecodes using the same structure as CompilationData:
// - order sources
// - order contracts for each source
// - capture bytecodes for each contract
export interface LoadedBytecodes {
  sources: {
    contracts: {
      createBytecode: IdObject<DataModel.IBytecode>;
      callBytecode: IdObject<DataModel.IBytecode>;
    }[];
  }[];
}

type Resource = {
  id: string;
};

export type IdObject<R extends Resource = Resource> = {
  [N in keyof R]: N extends "id" ? string : never;
};

export const toIdObject = <R extends Resource>({ id }: R): IdObject<R> =>
  ({
    id
  } as IdObject<R>);

export interface WorkspaceRequest {
  request: string; // GraphQL request
  variables: {
    [name: string]: any;
  };
}

export type WorkspaceResponse<N extends string = string, R = any> = {
  data: {
    workspace: { [RequestName in N]: R };
  };
};
