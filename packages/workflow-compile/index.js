const debug = require("debug")("workflow-compile");
const fse = require("fs-extra");
const {prepareConfig} = require("./utils");
const {Shims} = require("@truffle/compile-common");

const SUPPORTED_COMPILERS = {
  solc: require("@truffle/compile-solidity").Compile,
  vyper: require("@truffle/compile-vyper").Compile,
  external: require("@truffle/external-compile").Compile
};

const {connect, Project} = require("@truffle/db");

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

  const sources = compilations.reduce((a, compilation) => {
    return a.concat(compilation.sources);
  }, []);

  // return WorkflowCompileResult
  return {contracts, sources, compilations};
}

const WorkflowCompile = {
  async compile(options) {
    const config = prepareConfig(options);

    if (config.events) config.events.emit("compile:start");

    const {contracts, sources, compilations} = await compile(config);

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
      sources,
      compilations
    };
  },

  async compileAndSave(options) {
    const {contracts, sources, compilations} = await this.compile(options);

    return await this.save(options, {contracts, sources, compilations});
  },

  async save(options, {contracts, sources, compilations}) {
    const config = prepareConfig(options);

    await fse.ensureDir(config.contracts_build_directory);

    if (options.db && options.db.enabled === true && contracts.length > 0) {
      debug("saving to @truffle/db");
      const db = connect(config);
      const project = await Project.initialize({
        db,
        project: {
          directory: config.working_directory
        }
      });
      ({contracts, compilations} = await project.loadCompile({
        result: {contracts, sources, compilations}
      }));
    }

    const artifacts = contracts.map(Shims.NewToLegacy.forContract);
    await config.artifactor.saveAll(artifacts);

    return { contracts, sources, compilations };
  },

  async assignNames(options, { contracts }) {
    const config = prepareConfig(options);

    if (!config.db || !config.db.enabled || contracts.length === 0) {
      return;
    }

    const db = connect(config);
    const project = await Project.initialize({
      db,
      project: {
        directory: config.working_directory
      }
    });

    await project.assignNames({
      assignments: {
        contracts: contracts.map(({ db: { contract } }) => contract)
      }
    });
  }
};

module.exports = WorkflowCompile;
