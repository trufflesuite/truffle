import * as contract from "@truffle/contract";
import * as expect from "@truffle/expect";
import provision from "@truffle/provisioner";

import type { ResolverSource, ResolvedSource } from "./source";
import { EthPMv1, NPM, GlobalNPM, FS, Truffle, ABI, Vyper } from "./sources";

export interface ResolverOptions {
  includeTruffleSources?: boolean;
}

export class Resolver {
  options: any;
  sources: ResolverSource[];
  cache: ReturnType<typeof contract>[];

  constructor(options: any, resolverOptions: ResolverOptions = {}) {
    expect.options(options, [
      "working_directory",
      "contracts_build_directory",
      "contracts_directory"
    ]);

    const { includeTruffleSources } = resolverOptions;

    this.options = options;
    this.cache = [];

    let basicSources: ResolverSource[] = [
      new EthPMv1(options.working_directory),
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
    importPath: string,
    searchPath?: string
  ): ReturnType<typeof contract> {
    let abstraction;

    // remove file extension if present on name
    const sanitizedContractName = importPath
      .replace(/^\.\//, "")
      .replace(/\.sol$/i, "");

    // there may be more than one contract of the same name which will be
    // problematic - only return the first one found in the cache for now
    for (const contract of this.cache) {
      if (contract.contract_name === sanitizedContractName) {
        return contract;
      }
    }

    this.sources.forEach((source: ResolverSource) => {
      const result = source.require(importPath, searchPath);
      if (result) {
        abstraction = contract(result);
        provision(abstraction, this.options);
      }
    });
    if (abstraction) {
      this.cache.push(abstraction);
      return abstraction;
    }

    throw new Error(
      "Could not find artifacts for " + importPath + " from any sources"
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

  contracts(): ReturnType<typeof contract> {
    return this.cache;
  }
}
