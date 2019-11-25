const contract = require("@truffle/contract");
const expect = require("@truffle/expect");
const provision = require("@truffle/provisioner");
const sources = require("../sources");

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

module.exports = Resolver;
