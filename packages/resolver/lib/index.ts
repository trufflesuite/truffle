const whilst = require("async/whilst");
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

  resolve(import_path: string, imported_from: string, callback: Callback) {
    var self = this;

    if (typeof imported_from === "function") {
      callback = imported_from;
      imported_from = null;
    }

    var resolved_body: string | null = null;
    var resolved_path: string | null = null;
    var source: ResolverSource;
    var current_index = 0;

    whilst(
      function() {
        return !resolved_body && current_index <= self.sources.length - 1;
      },
      function(next: any) {
        source = self.sources[current_index];
        source
          .resolve(import_path, imported_from)
          .then((result: { body: string; filePath: string }) => {
            if (result.body) {
              resolved_body = result.body;
              resolved_path = result.filePath;
            }
            current_index++;
            next();
          })
          .catch(next);
      },
      function(err: any) {
        if (err) return callback(err);

        if (!resolved_body) {
          var message = "Could not find " + import_path + " from any sources";

          if (imported_from) {
            message += "; imported from " + imported_from;
          }

          return callback(new Error(message));
        }

        callback(null, resolved_body, resolved_path, source);
      }
    );
  }
}

module.exports = Resolver;
