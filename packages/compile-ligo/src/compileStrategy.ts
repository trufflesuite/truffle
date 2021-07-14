import { CompilerResult, ICompileStrategy } from "@truffle/compile-common";
import { readFileSync } from "fs";
import path from "path";

import { compile } from "./compile";

export class LigoCompileStrategy implements ICompileStrategy {
  public compiler = "ligo";
  public fileExtensions = ["ligo", "mligo", "religo"];

  public async compile(paths: string[]): Promise<CompilerResult> {
    const ligoCompilerResult = await compile(paths);

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
              language: "ligo"
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
  }
}
