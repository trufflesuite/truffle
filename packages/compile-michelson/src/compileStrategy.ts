import { CompilerResult, ICompileStrategy, Source, TezosCompiledContract } from "@truffle/compile-common";
import { Parser } from '@taquito/michel-codec';
import { readFileSync } from "fs";
import path from "path";
import { version } from "../package.json";

const compiler = {
  name: "@truffle/compile-michelson",
  version: `${version}`
};

const buildSource = (resultEntry: any): Source => {
  return {
    sourcePath: resultEntry.sourcePath,
    contents: resultEntry.source,
    language: "michelson"
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
    initialStorage: ""
  };
};

export class MichelsonCompileStrategy implements ICompileStrategy {
  public fileExtensions = ["tz"];

  public async compile(paths: string[]): Promise<CompilerResult> {
    const parser = new Parser();
    let contracts: Array<any> = [];

    for (const sourcePath of paths) {
      const extension = path.extname(sourcePath as string);
      const contractName = path.basename(sourcePath as string, extension);

      const sourceBuffer = readFileSync(sourcePath as string);
      const sourceContents = sourceBuffer.toString();
      const michelson = JSON.stringify(parser.parseScript(sourceContents));

      const contractDefinition = {
        contractName,
        sourcePath,
        source: sourceContents,
        michelson,
        compiler
      };

      contracts.push(contractDefinition);
    }

    return {
      compilations: [
        {
          sourceIndexes: paths,
          compiler,
          sources: Object.values(contracts).map(buildSource),
          contracts: Object.values(contracts).map(buildCompiledContract)
        }
      ]
    };
  }
}
