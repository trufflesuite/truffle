var debug = require("debug")("workflow-compile");

var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var { callbackify, promisify } = require("util");
var Config = require("truffle-config");
var solcCompile = require("truffle-compile");
var vyperCompile = require("truffle-compile-vyper");
var externalCompile = require("truffle-external-compile");
var expect = require("truffle-expect");
var _ = require("lodash");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");
var OS = require("os");

const SUPPORTED_COMPILERS = {
  "solc": solcCompile,
  "vyper": vyperCompile,
  "external": externalCompile,
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
  compile: callbackify(async function(options) {
    const config = prepareConfig(options);

    const compilers = (config.compiler)
      ? [config.compiler]
      : Object.keys(config.compilers);

    // convert to promise to compile+write
    const compilations = compilers.map(async (compiler) => {
      const compile = SUPPORTED_COMPILERS[compiler];
      if (!compile) throw new Error("Unsupported compiler: " + compiler);

      const compileFunc = (config.all === true || config.compileAll === true)
        ? compile.all
        : compile.necessary;

      let [contracts, output] = await multiPromisify(compileFunc)(config);

      if (contracts && Object.keys(contracts).length > 0) {
        await this.writeContracts(contracts, config)
      }

      return { compiler, contracts, output };
    });

    const collect = async (compilations) => {
      let result = {
        outputs: {},
        contracts: {}
      }

      for (let compilation of await Promise.all(compilations)) {
        let { compiler, output, contracts } = compilation;

        result.outputs[compiler] = output;

        for (let [ name, abstraction ] of Object.entries(contracts)) {
          result.contracts[name] = abstraction;
        }

      }

      return result;
    }

    return await collect(compilations);
  }),

  writeContracts: async function(contracts, options) {
    var logger = options.logger || console;

    const result = await promisify(mkdirp)(options.contracts_build_directory);

    if (options.quiet != true && options.quietWrite != true) {
      logger.log("Writing artifacts to ." + path.sep + path.relative(options.working_directory, options.contracts_build_directory) + OS.EOL);
    }

    var extra_opts = {
      network_id: options.network_id
    };

    await options.artifactor.saveAll(contracts, extra_opts);
  }
};

module.exports = Contracts;
