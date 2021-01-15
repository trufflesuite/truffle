import debugModule from "debug";
const debug = debugModule("resolver");

const contract = require("@truffle/contract");
const expect = require("@truffle/expect");
const provision = require("@truffle/provisioner");

import { ResolverSource } from "./source";
import { EthPMv1, NPM, GlobalNPM, FS, Truffle, ABI, Vyper } from "./sources";

export interface ResolverOptions {
  includeTruffleSources?: boolean;
  translateJsonToSolidity?: boolean;
  resolveVyperModules?: boolean;
}

export interface ResolvedSource {
  body: string;
  filePath: string;
  source: ResolverSource;
};

const defaultResolverOptions = {
  includeTruffleSources: false,
  translateJsonToSolidity: true,
  resolveVyperMoudles: false,
};

export class Resolver {
  options: any;
  sources: ResolverSource[];

  constructor(options: any, resolverOptions: ResolverOptions = {}) {
    expect.options(
      options,
      ["working_directory", "contracts_build_directory", "contracts_directory"]
    );

    resolverOptions = {
      ...defaultResolverOptions,
      ...resolverOptions
    };
    const {
      includeTruffleSources,
      translateJsonToSolidity,
      resolveVyperModules
    } = resolverOptions;

    this.options = options;
    this.sources = [
      ...(includeTruffleSources ? [new Truffle(options)] : []),
      new EthPMv1(options.working_directory),
      new NPM(options.working_directory),
      new GlobalNPM(),
      ...(translateJsonToSolidity
        ? [
            new ABI(
              options.working_directory,
              options.contracts_build_directory
            )
          ]
        : []),
      new FS(options.working_directory, options.contracts_build_directory)
    ];

    if (resolveVyperModules) {
      this.sources = this.sources.map(
        source => new Vyper(source, options.contracts_directory)
      );
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
  ): Promise<ResolvedSource> {
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
