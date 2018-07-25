var debug = require("debug")("workflow-compile");

var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var promisify = require("util").promisify;
var Config = require("truffle-config");
var solcCompile = require("truffle-compile");
var expect = require("truffle-expect");
var _ = require("lodash");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");
var OS = require("os");

const SUPPORTED_COMPILERS = {
  "solc": solcCompile,
};

function prepareConfig(options) {
  expect.options(options, [
    "contracts_build_directory"
  ]);

  expect.one(options, [
    "contracts_directory",
    "files"
  ]);

  // Use a config object to ensure we get the default sources.
  const config = Config.default().merge(options);

  if (!config.resolver) {
    config.resolver = new Resolver(config);
  }

  if (!config.artifactor) {
    config.artifactor = new Artifactor(config.contracts_build_directory);
  }

  return config;
}

function multiPromisify (func) {
  return (...args) => new Promise( (accept, reject) => {
    const callback = (err, ...results) => {
      if (err) reject(err);

      accept(results);
    };

    func(...args, callback);
  });
}

var Contracts = {

  // contracts_directory: String. Directory where .sol files can be found.
  // contracts_build_directory: String. Directory where .sol.js files can be found and written to.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // network_id: network id to link saved contract artifacts.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile: function(options, callback) {
    const config = prepareConfig(options);

    const writeContracts = promisify(this.write_contracts);

    // convert to promise to compile+write
    const compilations = Object.keys(config.compilers)
      .map(async (compiler) => {
        const compile = SUPPORTED_COMPILERS[compiler];
        if (!compile) throw new Error("Unsupported compiler: " + name);

        const compileFunc = (config.all === true || config.compileAll === true)
          ? compile.all
          : compile.necessary;

        let [contracts, paths] = await multiPromisify(compileFunc)(config);
        paths = paths || [];

        let abstractions = (contracts && Object.keys(contracts).length > 0)
          ? await writeContracts(contracts, config)
          : {}

        return { compiler, abstractions, paths };
      });

    const collect = async (compilations) => {
      let paths = [];
      let abstractions = {};

      for (let compilation of await Promise.all(compilations)) {
        let {
          compiler,
          abstractions: newAbstractions,
          paths: newPaths
        } = compilation;

        paths = paths.concat(newPaths);

        for (let [ name, abstraction ] of Object.entries(newAbstractions)) {
          abstractions[name] = abstraction;
        }

      }

      return { paths, abstractions };
    }

    collect(compilations)
      .then( ({abstractions, paths}) => callback(null, abstractions, paths) )
      .catch( (err) => callback(err) );
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
