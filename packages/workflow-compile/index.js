const debug = require("debug")("workflow-compile");
const fse = require("fs-extra");
const { prepareConfig } = require("./utils");
const { Shims } = require("@truffle/compile-common");
const {
  reportCompilationStarted,
  reportNothingToCompile,
  reportCompilationFinished
} = require("./reports");

const SUPPORTED_COMPILERS = {
  solc: require("@truffle/compile-solidity").Compile,
  vyper: require("@truffle/compile-vyper").Compile,
  external: require("@truffle/external-compile").Compile
};

const { TruffleDB } = require("@truffle/db");

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
      const Compile = SUPPORTED_COMPILERS[name];
      if (!Compile) throw new Error("Unsupported compiler: " + name);

      const compileMethod =
        config.all === true || config.compileAll === true
          ? Compile.all
          : Compile.necessary;

      return await compileMethod(config);
    })
  );

  // collect results - rawCompilations is CompilerResult[]
  // flatten the array and remove compilations without results
  const compilations = rawCompilations.reduce((a, compilerResult) => {
    compilerResult.compilations.forEach(compilation => {
      if (compilation.contracts.length > 0) {
        a = a.concat(compilation);
      }
    });
    return a;
  }, []);

  const contracts = compilations.reduce((a, compilation) => {
    return a.concat(compilation.contracts);
  }, []);

  // return WorkflowCompileResult
  return { contracts, compilations };
}

const WorkflowCompile = {
  async compile(options, loadDb = false) {
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

    if (
      config.db &&
      config.db.enabled === true &&
      contracts.length > 0 &&
      loadDb === true
    ) {
      const db = new TruffleDB(config);
      await db.loadCompilations({ contracts, compilations });
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

  async save(options, { contracts, _compilations }) {
    const config = prepareConfig(options);

    await fse.ensureDir(config.contracts_build_directory);

    const artifacts = contracts.map(Shims.NewToLegacy.forContract);
    await config.artifactor.saveAll(artifacts);
  }
};

module.exports = WorkflowCompile;
