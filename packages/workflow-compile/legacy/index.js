const debug = require("debug")("workflow-compile");
const fse = require("fs-extra");
const externalCompile = require("@truffle/external-compile");
const solcCompile = require("@truffle/compile-solidity");
const vyperCompile = require("@truffle/compile-vyper");
const { Shims } = require("@truffle/compile-common");
const expect = require("@truffle/expect");
const Config = require("@truffle/config");
const Artifactor = require("@truffle/artifactor");
const Resolver = require("@truffle/resolver").default;

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

  config.compilersInfo = {};

  if (!config.resolver) config.resolver = new Resolver(config);

  if (!config.artifactor) {
    config.artifactor = new Artifactor(config.contracts_build_directory);
  }

  return config;
}

const WorkflowCompile = {
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
  compile: async function (options, callback) {
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
        if (config.compileNone || config["compile-none"]) {
          config.events.emit("compile:skipped");
        } else {
          config.events.emit("compile:nothingToCompile");
        }
      }

      if (config.events) {
        config.events.emit("compile:succeed", {
          contractsBuildDirectory: config.contracts_build_directory,
          compilers: config.compilersInfo
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

  compileSources: async function (config, compilers) {
    compilers = config.compiler
      ? config.compiler === "none"
        ? []
        : [config.compiler]
      : Object.keys(config.compilers);

    return Promise.all(
      compilers.map(async compiler => {
        const compile = SUPPORTED_COMPILERS[compiler];
        if (!compile) throw new Error("Unsupported compiler: " + compiler);

        config.compilersInfo = [];
        const { Compile } = compile;
        const compileFunc =
          config.all === true || config.compileAll === true
            ? Compile.all
            : Compile.necessary;

        const { compilations } = await compileFunc(config);
        const { contracts, output } = compilations.reduce(
          (a, compilation) => {
            for (const contract of compilation.contracts) {
              a.contracts[contract.contractName] =
                Shims.NewToLegacy.forContract(contract);
            }
            a.output = a.output.concat(compilation.sourceIndexes);
            return a;
          },
          {
            contracts: {},
            output: []
          }
        );

        let compilerUsed;
        if (compilations[0] && compilations[0].compiler) {
          compilerUsed = {
            name: compilations[0].compiler.name,
            version: compilations[0].compiler.version
          };
        }

        if (compilerUsed) {
          config.compilersInfo.push(compilerUsed);
        }

        if (contracts && Object.keys(contracts).length > 0) {
          await this.writeContracts(contracts, config);
        }

        return { compiler, contracts, output };
      })
    );
  },

  writeContracts: async (contracts, options) => {
    fse.ensureDirSync(options.contracts_build_directory);
    await options.artifactor.saveAll(contracts);
  }
};

module.exports = WorkflowCompile;
