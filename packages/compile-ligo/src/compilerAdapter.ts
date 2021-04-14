import { CompilerResult, Source, TezosCompiledContract } from "@truffle/compile-common";

const compiler = {
  name: "ligo",
  version: "next"
};

const buildSource = (resultEntry: any): Source => {
  return {
    sourcePath: resultEntry.sourcePath,
    contents: resultEntry.source,
    language: compiler.name
  };
};

const buildCompiledContract = (resultEntry: any): TezosCompiledContract => {
  return {
    architecture: "tezos",
    contractName: resultEntry.contractName,
    sourcePath: resultEntry.sourcePath,
    source: resultEntry.source,
    metadata: "",
    compiler,
    michelson: resultEntry.michelson,
    initialStorage: "" // TODO BGC
  };
};

const compilerAdapter =  (ligoCompilerResult: {
  result: any;
  paths: string[];
  compiler: {
      name: string;
      version: string;
  };
}): CompilerResult => {
  return {
    compilations: [
      {
        sourceIndexes: ligoCompilerResult.paths,
        compiler,
        sources: Object.values(ligoCompilerResult.result).map(buildSource),
        contracts: Object.values(ligoCompilerResult.result).map(buildCompiledContract)
      }
    ]
  };
};

export { compilerAdapter };