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
  sourceIndexes: string[];
  contracts: CompiledContract[];
}

export interface ContractBytecodes {
  createBytecode: DataModel.IBytecode;
  callBytecode: DataModel.IBytecode;
}

type Resource = {
  id: string;
};

export type IdObject<R extends Resource = Resource> = {
  [N in keyof R]: N extends "id" ? string : never
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

/**
 * Output format of @truffle/workflow-compile/new
 */
export interface WorkflowCompileResult {
  compilations: { [compilerName: string]: CompilationData };
  contracts: { [contractName: string]: ContractObject };
}
