const contract = require("@truffle/contract");
const expect = require("@truffle/expect");
const provision = require("@truffle/provisioner");

import type { ResolverSource, ResolvedSource } from "./source";
import { NPM, GlobalNPM, FS, Truffle, ABI, Vyper } from "./sources";

export interface ResolverOptions {
  includeTruffleSources?: boolean;
}

export class Resolver {
  options: any;
  sources: ResolverSource[];

  constructor(
    options: any,
    resolverOptions: ResolverOptions = { includeTruffleSources: true }
  ) {
    expect.options(options, [
      "working_directory",
      "contracts_build_directory",
      "contracts_directory"
    ]);

    const { includeTruffleSources } = resolverOptions;

    this.options = options;

    let basicSources: ResolverSource[] = [
      new NPM(options.working_directory),
      new GlobalNPM(),
      new FS(options.working_directory, options.contracts_build_directory)
    ];
    if (includeTruffleSources) {
      basicSources.unshift(new Truffle(options));
    }

    //set up abi-to-sol resolution
    this.sources = [].concat(
      ...basicSources.map(source => [new ABI(source), source])
    );

    //set up vyper resolution rules
    this.sources = [
      new Vyper(basicSources, options.contracts_directory),
      ...this.sources //for Vyper this is redundant
    ];
  }

  // This function might be doing too much. If so, too bad (for now).
  require(
    import_path: string,
    search_path?: string
  ): ReturnType<typeof contract> {
    for (const source of this.sources) {
      const result = source.require(import_path, search_path);
      if (result) {
        let abstraction = contract(result);
        provision(abstraction, this.options);
        return abstraction;
      }
    }

    // exhausted sources and could not resolve
    throw new Error(
      "Could not find artifacts for " + import_path + " from any sources"
    );
  }

  async resolve(
    importPath: string,
    importedFrom: string,
    options: {
      compiler?: {
        name: string;
        version: string;
      };
    } = {}
  ): Promise<ResolvedSource> {
    let body: string | null = null;
    let filePath: string | null = null;
    let source: ResolverSource | null = null;

    for (source of this.sources) {
      ({ body, filePath } = await source.resolve(
        importPath,
        importedFrom,
        options
      ));

      if (body !== undefined) {
        break;
      }
    }

    if (body === undefined) {
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
