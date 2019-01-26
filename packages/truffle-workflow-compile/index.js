const debug = require("debug")("workflow-compile");
const mkdirp = require("mkdirp");
const { callbackify, promisify } = require("util");
const Config = require("truffle-config");
const solcCompile = require("truffle-compile");
const vyperCompile = require("truffle-compile-vyper");
const externalCompile = require("truffle-external-compile");
const expect = require("truffle-expect");
const Resolver = require("truffle-resolver");
const Artifactor = require("truffle-artifactor");
const { compilationReporter } = require("truffle-reporters");

const SUPPORTED_COMPILERS = {
  solc: solcCompile,
  vyper: vyperCompile,
  external: externalCompile
};

function prepareConfig(options) {
  expect.options(options, ["contracts_build_directory"]);

  expect.one(options, ["contracts_directory", "files"]);

  // Use a config object to ensure we get the default sources.
  const config = Config.default().merge(options);

  if (!config.resolver) {
    config.resolver = new Resolver(config);
  }

  if (!config.artifactor) {
    config.artifactor = new Artifactor(config.contracts_build_directory);
  }

  config.reporter = compilationReporter;

  return config;
}

function multiPromisify(func) {
  return (...args) =>
    new Promise((accept, reject) => {
      const callback = (err, ...results) => {
        if (err) reject(err);

        accept(results);
      };

      func(...args, callback);
    });
}

const Contracts = {
  // contracts_directory: String. Directory where .sol files can be found.
  // contracts_build_directory: String. Directory where .sol.js files can be found and written to.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // network_id: network id to link saved contract artifacts.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile: callbackify(async function(options) {
    const config = prepareConfig(options);

    const compilers = config.compiler
      ? [config.compiler]
      : Object.keys(config.compilers);

    config.reporter.startJob(options);

    // convert to promise to compile+write
    const compilations = compilers.map(async compiler => {
      const compile = SUPPORTED_COMPILERS[compiler];
      if (!compile) throw new Error("Unsupported compiler: " + compiler);

      const compileFunc =
        config.all === true || config.compileAll === true
          ? compile.all
          : compile.necessary;

      let [contracts, output] = await multiPromisify(compileFunc)(config);

      if (contracts && Object.keys(contracts).length > 0) {
        await this.writeContracts(contracts, config);
      }

      return { compiler, contracts, output };
    });

    const collect = async compilations => {
      let result = {
        outputs: {},
        contracts: {}
      };

      for (let compilation of await Promise.all(compilations)) {
        let { compiler, output, contracts } = compilation;

        result.outputs[compiler] = output;

        for (let [name, abstraction] of Object.entries(contracts)) {
          result.contracts[name] = abstraction;
        }
      }

      return result;
    };

    return await collect(compilations);
  }),

  writeContracts: async function(contracts, options) {
    await promisify(mkdirp)(options.contracts_build_directory);

    if (options.quiet != true && options.quietWrite != true) {
      options.reporter.writeArtifacts(options);
    }

    var extra_opts = {
      network_id: options.network_id
    };

    await options.artifactor.saveAll(contracts, extra_opts);
  }
};

module.exports = Contracts;
