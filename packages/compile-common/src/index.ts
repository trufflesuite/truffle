import { Profiler } from "./profiler";
import * as shims from "./shims";
export { Profiler, shims };

import { ContractObject } from "@truffle/contract-schema/spec";

export type Compilation = {
  sourceIndexes: string[];
  contracts: CompiledContract[];
  compiler: {
    name: string | undefined;
    version: string | undefined;
  };
};

export type CompilerResult = Compilation[];

export interface Bytecode {
  bytes: string;
  linkReferences: LinkReference[];
}

export interface LinkReference {
  offsets: number[];
  name: string | null; // this will be the contractName of the library or some other identifier
  length: number;
}

export type CompiledContract = {
  contractName: string;
  sourcePath: string;
  source: string;
  sourceMap: string;
  deployedSourceMap: string;
  legacyAST: object;
  ast: object;
  abi: object[];
  metadata: string;
  bytecode: Bytecode;
  deployedBytecode: Bytecode;
  compiler: {
    name: string;
    version: string;
  };
  devdoc: object;
  userdoc: object;
  immutableReferences: object;
};

export interface WorkflowCompileResult {
  compilations: Compilation[];
  contracts: CompiledContract[];
}
