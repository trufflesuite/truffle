import { CompilerResult } from "@truffle/compile-common";
import { readFileSync } from "fs";
import path from "path";

const compileAdapter =  (ligoCompilerResult: {
  compilationResults: { sourcePath: string, michelson: string }[];
  compiler: {
    name: string;
    version: string;
  };
}): CompilerResult => {
  const contractDetails = ligoCompilerResult.compilationResults.map(result => {
    const extension = path.extname(result.sourcePath);
    const contractName = path.basename(result.sourcePath, extension);

    const sourceBuffer = readFileSync(result.sourcePath);
    const source = sourceBuffer.toString();

    return {
      sourcePath: result.sourcePath,
      michelson: result.michelson,
      contractName,
      source
    };
  });

  return {
    compilations: [
      {
        sourceIndexes: contractDetails.map(result => result.sourcePath),
        compiler: ligoCompilerResult.compiler,
        sources: contractDetails.map(result => {
          return {
            sourcePath: result.sourcePath,
            contents: result.source,
            language: ligoCompilerResult.compiler.name
          };
        }),
        contracts: contractDetails.map(result => {
          return {
            architecture: "tezos",
            contractName: result.contractName,
            sourcePath: result.sourcePath,
            source: result.source,
            michelson: result.michelson,
            compiler: ligoCompilerResult.compiler
          };
        })
      }
    ]
  };
};

export { compileAdapter };
