const debug = require("debug")("workflow-compile");
const fse = require("fs-extra");
const externalCompile = require("@truffle/external-compile");
const solcCompile = require("@truffle/compile-solidity/legacy");
const vyperCompile = require("@truffle/compile-vyper");
const { prepareConfig, multiPromisify } = require("../utils");
const {
  reportCompilationStarted,
  reportNothingToCompile,
  reportCompilationFinished
} = require("../reports");

const SUPPORTED_COMPILERS = {
  solc: solcCompile,
  vyper: vyperCompile,
  external: externalCompile
};

const Contracts = {
  collectCompilations: async compilations => {
    let result = { outputs: {}, contracts: {} };

    for (let compilation of await Promise.all(compilations)) {
      let { compiler, output, contracts } = compilation;

      result.outputs[compiler] = output;

      for (let [name, abstraction] of Object.entries(contracts)) {
        result.contracts[name] = abstraction;
      }
    }

    return result;
  },

  // contracts_directory: String. Directory where .sol files can be found.
  // contracts_build_directory: String. Directory where .sol.js files can be found and written to.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // network_id: network id to link saved contract artifacts.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile: async function(options, callback) {
    const callbackPassed = typeof callback === "function";
    try {
      const config = prepareConfig(options);

      const compilers = config.compiler
        ? [config.compiler]
        : Object.keys(config.compilers);

      if (config.events) config.events.emit("compile:start");

      const compilations = await this.compileSources(config, compilers);

      const numberOfCompiledContracts = compilations.reduce(
        (number, compilation) => {
          return number + Object.keys(compilation.contracts).length;
        },
        0
      );

      if (numberOfCompiledContracts === 0 && config.events) {
        config.events.emit("compile:nothingToCompile");
      }

      if (config.events) {
        config.events.emit("compile:succeed", {
          contractsBuildDirectory: config.contracts_build_directory,
          compilersInfo: config.compilersInfo
        });
      }

      const result = await this.collectCompilations(compilations);
      if (callbackPassed) return callback(null, result);
      return result;
    } catch (error) {
      if (callbackPassed) return callback(error);
      throw error;
    }
  },

  compileSources: async function(config, compilers) {
    return Promise.all(
      compilers.map(async compiler => {
        const compile = SUPPORTED_COMPILERS[compiler];
        if (!compile) throw new Error("Unsupported compiler: " + compiler);

        const compileFunc = multiPromisify(
          config.all === true || config.compileAll === true
            ? compile.all
            : compile.necessary
        );

        let [contracts, output, compilerUsed] = await compileFunc(config);

        if (compilerUsed) {
          config.compilersInfo[compilerUsed.name] = {
            version: compilerUsed.version
          };
        }

        if (contracts && Object.keys(contracts).length > 0) {
          await this.writeContracts(contracts, config);
        }

        return { compiler, contracts, output };
      })
    );
  },

  reportCompilationStarted,
  reportCompilationFinished,
  reportNothingToCompile,

  writeContracts: async (contracts, options) => {
    fse.ensureDirSync(options.contracts_build_directory);
    await options.artifactor.saveAll(contracts);
  }
};

module.exports = Contracts;
