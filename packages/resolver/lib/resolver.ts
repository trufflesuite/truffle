const contract = require("@truffle/contract");
const expect = require("@truffle/expect");
const provision = require("@truffle/provisioner");

import { ResolverSource } from "./source";
import { EthPMv1, NPM, GlobalNPM, FS, Truffle } from "./sources";

export class Resolver {
  options: any;
  sources: ResolverSource[];

  constructor(options: any, includeTruffleSource: boolean = false) {
    expect.options(options, ["working_directory", "contracts_build_directory"]);

    this.options = options;
    this.sources = [
      new EthPMv1(options.working_directory),
      new NPM(options.working_directory),
      new GlobalNPM(),
      new ABI(options.working_directory, options.contracts_build_directory),
      new FS(options.working_directory, options.contracts_build_directory)
    ];

    if (includeTruffleSource) {
      this.sources.unshift(new Truffle(options));
    }
  }

  // This function might be doing too much. If so, too bad (for now).
  require(import_path: string, search_path: string) {
    let abstraction;
    this.sources.forEach((source: ResolverSource) => {
      const result = source.require(import_path, search_path);
      if (result) {
        abstraction = contract(result);
        provision(abstraction, this.options);
      }
    });
    if (abstraction) return abstraction;
    throw new Error(
      "Could not find artifacts for " + import_path + " from any sources"
    );
  }

  async resolve(
    importPath: string,
    importedFrom: string
  ): Promise<{ body: string; filePath: string; source: ResolverSource }> {
    let body: string | null = null;
    let filePath: string | null = null;
    let source: ResolverSource | null = null;

    for (source of this.sources) {
      ({ body, filePath } = await source.resolve(importPath, importedFrom));

      if (body) {
        break;
      }
    }

    if (!body) {
      let message = `Could not find ${importPath} from any sources`;

      if (importedFrom) {
        message += "; imported from " + importedFrom;
      }

      throw new Error(message);
    }

    return {
      body,
      filePath,
      source
    };
  }
}
