const whilst = require("async/whilst");
const contract = require("@truffle/contract");
const expect = require("@truffle/expect");
const provision = require("@truffle/provisioner");
const sources = require("./sources");

function Resolver(options) {
  expect.options(options, ["working_directory", "contracts_build_directory"]);

  this.options = options;
  this.sources = sources(options);
}

// This function might be doing too much. If so, too bad (for now).
Resolver.prototype.require = function(import_path, search_path) {
  let abstraction;
  this.sources.forEach(source => {
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
};

Resolver.prototype.resolve = function(import_path, imported_from, callback) {
  var self = this;

  if (typeof imported_from === "function") {
    callback = imported_from;
    imported_from = null;
  }

  var resolved_body = null;
  var resolved_path = null;
  var source;
  var current_index = 0;

  whilst(
    function() {
      return !resolved_body && current_index <= self.sources.length - 1;
    },
    function(next) {
      source = self.sources[current_index];
      source.resolve(import_path, imported_from)
        .then(result => {
          if (result.body) {
            resolved_body = result.body;
            resolved_path = result.filePath;
          }
          current_index++;
          next();
        })
        .catch(next);
    },
    function(err) {
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
};

module.exports = Resolver;
