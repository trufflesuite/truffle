import { Profiler } from "./profiler";
export { Profiler };

type Compilation = {
  sourceIndexes: string[];
  contracts: CompiledContract[];
  compiler: {
    name: string;
    version: string;
  };
};

type CompilerResult = Compilation[];

type CompiledContract = {
  contractName: string;
  contract_name: string;
  sourcePath: string;
  source: string;
  sourceMap: string;
  deployedSourceMap: string;
  legacyAST: object;
  ast: object;
  abi: object[];
  metadata: string;
  bytecode: string;
  deployedBytecode: string;
  compiler: {
    name: string;
    version: string;
  };
  devdoc: object;
  userdoc: object;
};

type ContractObject = {
  contract_name: string;
  sourcePath: string;
  source: string;
  sourceMap: string;
  deployedSourceMap: string;
  legacyAST: object;
  ast: object;
  abi: object[];
  metadata: string;
  bytecode: string;
  deployedBytecode: string;
  unlinked_binary: string;
  compiler: {
    name: string;
    version: string;
  };
  devdoc: object;
  userdoc: object;
  immutableReferences;
};

interface WorkflowCompileResult {
  compilations: Compilation[];
  contracts: ContractObject[];
}
