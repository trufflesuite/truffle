var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var Config = require("truffle-config");
var compile = require("truffle-compile");
var expect = require("truffle-expect");
var _ = require("lodash");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");
var OS = require("os");

var Contracts = {

  // contracts_directory: String. Directory where .sol files can be found.
  // contracts_build_directory: String. Directory where .sol.js files can be found and written to.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // network_id: network id to link saved contract artifacts.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile: function(options, callback) {
    var self = this;

    expect.options(options, [
      "contracts_build_directory"
    ]);

    expect.one(options, [
      "contracts_directory",
      "files"
    ]);

    // Use a config object to ensure we get the default sources.
    var config = Config.default().merge(options);

    if (!config.resolver) {
      config.resolver = new Resolver(config);
    }

    if (!config.artifactor) {
      config.artifactor = new Artifactor(config.contracts_build_directory);
    }

    function finished(err, contracts, paths) {
      if (err) return callback(err);

      if (contracts != null && Object.keys(contracts).length > 0) {
        self.write_contracts(contracts, config, function(err, abstractions) {
          callback(err, abstractions, paths);
        });
      } else {
        callback(null, [], paths);
      }
    };

    if (config.all === true || config.compileAll === true) {
      compile.all(config, finished);
    } else {
      compile.necessary(config, finished);
    }
  },

  write_contracts: function(contracts, options, callback) {
    var logger = options.logger || console;

    mkdirp(options.contracts_build_directory, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      if (options.quiet != true && options.quietWrite != true) {
        logger.log("Writing artifacts to ." + path.sep + path.relative(options.working_directory, options.contracts_build_directory) + OS.EOL);
      }

      var extra_opts = {
        network_id: options.network_id
      };

      options.artifactor.saveAll(contracts, extra_opts).then(function() {
        callback(null, contracts);
      }).catch(callback);
    });
  }
};

module.exports = Contracts;
