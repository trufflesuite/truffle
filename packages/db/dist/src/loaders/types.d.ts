import { ContractObject } from "@truffle/contract-schema/spec";
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
  sources: SourceData[];
}
export interface SourceData {
  index: number;
  input: DataModel.ISourceInput;
  contracts: CompiledContract[];
}
export interface LoadedSources {
  [sourcePath: string]: IdObject<DataModel.ISource>;
}
export interface LoadedBytecodes {
  sources: {
    contracts: {
      createBytecode: IdObject<DataModel.IBytecode>;
      callBytecode: IdObject<DataModel.IBytecode>;
    }[];
  }[];
}
declare type Resource = {
  id: string;
};
export declare type IdObject<R extends Resource = Resource> = {
  [N in keyof R]: N extends "id" ? string : never;
};
export declare const toIdObject: <R extends Resource>({ id }: R) => IdObject<R>;
export interface WorkspaceRequest {
  request: string;
  variables: {
    [name: string]: any;
  };
}
export declare type WorkspaceResponse<N extends string = string, R = any> = {
  data: {
    workspace: {
      [RequestName in N]: R;
    };
  };
};
/**
 * Output format of @truffle/workflow-compile/new
 */
export interface WorkflowCompileResult {
  compilations: {
    [compilerName: string]: {
      sourceIndexes: string[];
      contracts: CompiledContract[];
    };
  };
  contracts: {
    [contractName: string]: ContractObject;
  };
}
export {};
