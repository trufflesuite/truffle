const debug = require("debug")("workflow-compile:new");
const fse = require("fs-extra");
const { prepareConfig, byContractName } = require("../utils");
const { shimLegacy } = require("../shims");
const { shimContract } = require("@truffle/compile-solidity/legacy/shims");
const {
  reportCompilationStarted,
  reportNothingToCompile,
  reportCompilationFinished
} = require("../reports");

const SUPPORTED_COMPILERS = {
  solc: {
    compiler: require("@truffle/compile-solidity/new")
  },
  vyper: {
    compiler: require("@truffle/compile-vyper"),
    legacy: true
  },
  external: {
    compiler: require("@truffle/external-compile"),
    legacy: true
  }
};

async function compile(config) {
  // determine compiler(s) to use
  //

  const compilers = config.compiler
    ? [config.compiler]
    : Object.keys(config.compilers);

  // invoke compilers
  //

  const rawCompilations = await Promise.all(
    compilers.map(async name => {
      const { compiler, legacy } = SUPPORTED_COMPILERS[name] || {};
      if (!compiler) throw new Error("Unsupported compiler: " + name);

      const method =
        config.all === true || config.compileAll === true
          ? compiler.all
          : compiler.necessary;

      const compile = legacy ? shimLegacy(method) : method;

      return {
        [name]: await compile(config)
      };
    })
  );

  // collect results
  //

  const compilations = rawCompilations.reduce(
    (a, b) => Object.assign({}, a, b),
    {}
  );

  const [compilerUsed] = Object.values(compilations)
    .map(({ compilerInfo }) => compilerInfo)
    .filter(compilerInfo => compilerInfo);

  const contracts = Object.values(compilations)
    .map(({ contracts }) => contracts)
    .reduce((a, b) => [...a, ...b], []);

  return { contracts, compilations, compilerUsed };
}

const Contracts = {
  async compile(options) {
    const config = prepareConfig(options);

    if (config.events) config.events.emit("compile:start");

    const { contracts, compilations, compilerUsed } = await compile(config);

    if (compilerUsed) {
      config.compilersInfo[compilerUsed.name] = {
        version: compilerUsed.version
      };
    }

    if (contracts.length === 0 && config.events) {
      config.events.emit("compile:nothingToCompile");
    }

    if (config.events) {
      config.events.emit("compile:succeed", {
        contractsBuildDirectory: config.contracts_build_directory,
        compilersInfo: config.compilersInfo
      });
    }
    return {
      contracts,
      compilations
    };
  },

  reportCompilationStarted,
  reportCompilationFinished,
  reportNothingToCompile,

  async save(options, contracts) {
    const config = prepareConfig(options);

    await fse.ensureDir(config.contracts_build_directory);

    const artifacts = byContractName(contracts.map(shimContract));
    await config.artifactor.saveAll(artifacts);
  }
};

module.exports = Contracts;
