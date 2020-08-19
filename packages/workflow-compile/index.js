const debug = require("debug")("workflow-compile");
const fse = require("fs-extra");
const { prepareConfig } = require("./utils");
const { shimLegacy } = require("./shims");
const { shimContract } = require("@truffle/compile-solidity/legacy/shims");
const {
  reportCompilationStarted,
  reportNothingToCompile,
  reportCompilationFinished
} = require("./reports");

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
    ? config.compiler === "none"
      ? []
      : [config.compiler]
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

      // return from `compile` is an array of compilations
      return await compile(config);
    })
  );

  // collect results
  // flatten the array and remove compilations without results
  const compilations = rawCompilations.reduce((a, compilationGroup) => {
    compilationGroup.forEach(compilation => {
      if (compilation.contracts.length > 0) {
        a = a.concat(compilation);
      }
    });
    return a;
  }, []);

  const contracts = compilations.reduce((a, compilation) => {
    return a.concat(compilation.contracts);
  }, []);

  return { contracts, compilations };
}

const Contracts = {
  async compile(options) {
    const config = prepareConfig(options);

    if (config.events) config.events.emit("compile:start");

    const { contracts, compilations } = await compile(config);

    const compilers = compilations
      .reduce((a, compilation) => {
        return a.concat(compilation.compiler);
      }, [])
      .filter(compiler => compiler);

    if (contracts.length === 0 && config.events) {
      config.events.emit("compile:nothingToCompile");
    }

    if (config.events) {
      config.events.emit("compile:succeed", {
        contractsBuildDirectory: config.contracts_build_directory,
        compilers
      });
    }
    return {
      contracts,
      compilations
    };
  },

  async compileAndSave(options) {
    const { contracts, compilations } = await this.compile(options);
    await this.save(options, { contracts, compilations });
    return {
      contracts,
      compilations
    };
  },

  reportCompilationStarted,
  reportCompilationFinished,
  reportNothingToCompile,

  async save(options, { contracts, compilations }) {
    const config = prepareConfig(options);

    await fse.ensureDir(config.contracts_build_directory);

    const artifacts = contracts.map(shimContract);
    await config.artifactor.saveAll(artifacts);
  }
};

module.exports = Contracts;
