import { CompilerResult, ICompileStrategy } from "@truffle/compile-common";
import { Parser } from '@taquito/michel-codec';
import { readFileSync } from "fs";
import path from "path";

import { version } from "../package.json";

const compiler = {
  name: "@truffle/compile-michelson",
  version: `${version}`
};

export class MichelsonCompileStrategy implements ICompileStrategy {
  public compiler = "michelson";
  public fileExtensions = ["tz"];

  public async compile(paths: string[]): Promise<CompilerResult> {
    const parser = new Parser();
    const contractDetails = paths.map(sourcePath => {
      const extension = path.extname(sourcePath as string);
      const contractName = path.basename(sourcePath as string, extension);

      const sourceBuffer = readFileSync(sourcePath as string);
      const source = sourceBuffer.toString();
      const michelson = JSON.stringify(parser.parseScript(source));

      return {
        sourcePath,
        michelson,
        contractName,
        source
      };
    });

    return {
      compilations: [
        {
          sourceIndexes: paths,
          compiler,
          sources: contractDetails.map(result => {
            return {
              sourcePath: result.sourcePath,
              contents: result.source,
              language: "michelson"
            };
          }),
          contracts: contractDetails.map(result => {
            return {
              architecture: "tezos",
              contractName: result.contractName,
              sourcePath: result.sourcePath,
              source: result.source,
              michelson: result.michelson,
              compiler: compiler
            };
          })
        }
      ]
    };
  }
}
