const contract = require("@truffle/contract");
const expect = require("@truffle/expect");
const provision = require("@truffle/provisioner");
const sources = require("./sources");

import { ResolverSource } from "./source";

type Callback = (
  err: Error | null,
  body?: string,
  filePath?: string,
  source?: ResolverSource
) => void;

class Resolver {
  options: any;
  sources: ResolverSource[];

  constructor(options: any) {
    expect.options(options, ["working_directory", "contracts_build_directory"]);

    this.options = options;
    this.sources = sources(options);
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

  resolve(importPath: string, importedFrom: string, callback: Callback) {
    if (typeof importedFrom === "function") {
      callback = importedFrom;
      importedFrom = null;
    }

    this._resolve(importPath, importedFrom)
      .then(({ body, filePath, source }) =>
        callback(null, body, filePath, source)
      )
      .catch(error => callback(error));
  }

  private async _resolve(
    importPath: string,
    importedFrom: string
  ): Promise<{ body: string; filePath: string; source: ResolverSource }> {
    let body: string | null = null;
    let filePath: string | null = null;
    let source: ResolverSource | null = null;

    // for (const index = 0; !body && index < this.sources.length; index++) {
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

module.exports = Resolver;
