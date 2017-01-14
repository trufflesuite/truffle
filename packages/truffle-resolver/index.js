var EPMSource = require("./epm");
var NPMSource = require("./npm");
var FSSource = require("./fs");
var whilst = require("async/whilst");
var contract = require("truffle-contract");
var expect = require("truffle-expect");

function Resolver(options) {
  expect.options(options, [
    "working_directory",
    "contracts_build_directory",
  ]);

  this.options = options;

  this.sources = [
    new EPMSource(options.working_directory, options.contracts_build_directory),
    new NPMSource(options.working_directory),
    new FSSource(options.working_directory, options.contracts_build_directory)
  ];

  //this.cache = {};
};

// This function might be doing too much. If so, too bad (for now).
Resolver.prototype.require = function(import_path, search_path) {
  var self = this;

  // if (this.cache[import_path]) {
  //   return this.cache[import_path];
  // }

  for (var i = 0; i < this.sources.length; i++) {
    var source = this.sources[i];
    var result = source.require(import_path, search_path);
    if (result) {
      var abstraction = contract(result);
      abstraction = this.provision(abstraction);

      //self.cache[import_path] = abstraction;

      return abstraction;
    }
  }
  throw new Error("Could not find artifacts for " + import_path + " from any sources");
};

Resolver.prototype.provision = function(abstraction) {
  var self = this;

  if (self.options.provider) {
    abstraction.setProvider(self.options.provider);
  }

  if (self.options.network_id) {
    abstraction.setNetwork(self.options.network_id);
  }

  ["from", "gas", "gasPrice"].forEach(function(key) {
    if (self.options[key]) {
      var obj = {};
      obj[key] = self.options[key];
      abstraction.defaults(obj);
    }
  });

  return abstraction;
};

Resolver.prototype.resolve = function(import_path, imported_from, callback) {
  var self = this;

  if (typeof imported_from == "function") {
    callback = imported_from;
    imported_from = null;
  }

  var body = null;
  var current_index = -1;
  var current_source;

  whilst(function() {
    return !body && current_index < self.sources.length - 1;
  }, function(next) {
    current_index += 1;
    current_source = self.sources[current_index];

    current_source.resolve(import_path, function(err, potential_source) {
      body = potential_source;
      next();
    });
  }, function(err) {
    if (err) return callback(err);

    if (!body) {
      var message = "Could not find " + import_path + " from any sources";

      if (imported_from) {
        message += "; imported from " + imported_from;
      }

      return callback(new Error(message));
    }

    callback(null, body, current_source);
  })
};

module.exports = Resolver;
