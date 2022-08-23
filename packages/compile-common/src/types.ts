import type { Abi, ImmutableReferences } from "@truffle/contract-schema/spec";

export type Compilation = {
  sourceIndexes: string[]; //note: does not include internal sources
  sources: Source[]; //note: does not include internal sources
  contracts: CompiledContract[];
  compiler: {
    name: string | undefined;
    version: string | undefined;
  };
  db?: {};
};

export type Source = {
  sourcePath: string;
  contents: string;
  ast?: object;
  legacyAST?: object;
  language: string;
};

export interface CompilerResult {
  compilations: Compilation[];
}

export interface Bytecode {
  bytes: string;
  linkReferences: LinkReference[];
}

export interface LinkReference {
  offsets: number[];
  name: string | null; // this will be the contractName of the library or some other identifier
  length: number;
}

export interface GeneratedSource {
  id: number;
  name: string;
  language: string;
  contents: string;
  ast: any;
}

export type CompiledContract = {
  contractName: string;
  sourcePath: string;
  source: string;
  sourceMap: string;
  deployedSourceMap: string;
  legacyAST?: object;
  ast?: object;
  abi: Abi;
  metadata: string;
  bytecode?: Bytecode;
  deployedBytecode?: Bytecode;
  compiler: {
    name: string;
    version: string;
  };
  devdoc: object;
  userdoc: object;
  immutableReferences: ImmutableReferences;
  generatedSources?: GeneratedSource[];
  deployedGeneratedSources?: GeneratedSource[];
  db?: {};
};

export interface WorkflowCompileResult {
  compilations: Compilation[];
  contracts: CompiledContract[];
}

export interface Compiler {
  all: (options: object) => Promise<CompilerResult>;

  necessary: (options: object) => Promise<CompilerResult>;

  sources: ({
    sources,
    options
  }: {
    sources: object;
    options: object;
  }) => Promise<CompilerResult>;

  sourcesWithDependencies: ({
    paths,
    options
  }: {
    paths: string[];
    options: object;
  }) => Promise<CompilerResult>;
}
