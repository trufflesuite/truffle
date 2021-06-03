import { CompilerResult } from "@truffle/compile-common";
import { readFileSync } from "fs";
import path from "path";

import { LigoCompilerOutput } from "./compile";

const compileAdapter =  (ligoCompilerResult: LigoCompilerOutput): CompilerResult => {
  const contractDetails = ligoCompilerResult.results.map(result => {
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
        compiler: ligoCompilerResult.compilerDetails,
        sources: contractDetails.map(result => {
          return {
            sourcePath: result.sourcePath,
            contents: result.source,
            language: ligoCompilerResult.compilerDetails.name
          };
        }),
        contracts: contractDetails.map(result => {
          return {
            architecture: "tezos",
            contractName: result.contractName,
            sourcePath: result.sourcePath,
            source: result.source,
            michelson: result.michelson,
            compiler: ligoCompilerResult.compilerDetails
          };
        })
      }
    ]
  };
};

export { compileAdapter };
