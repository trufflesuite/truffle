const debug = require("debug")("workflow-compile");
const fse = require("fs-extra");
const { prepareConfig } = require("./utils");
const { Shims } = require("@truffle/compile-common");
const { getTruffleDb } = require("@truffle/db-loader");

const SUPPORTED_COMPILERS = {
  solc: require("@truffle/compile-solidity").Compile,
  vyper: require("@truffle/compile-vyper").Compile,
  external: require("@truffle/external-compile").Compile
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

  // collect together contracts as well as compilations
  const contracts = rawCompilations.flatMap(
    compilerResult => compilerResult.contracts
  );

  // return WorkflowCompileResult
  return { contracts, compilations };
}

const WorkflowCompile = {
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
      if (config.compileNone || config["compile-none"]) {
        config.events.emit("compile:skipped");
      } else {
        config.events.emit("compile:nothingToCompile");
      }
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

    return await this.save(options, { contracts, compilations });
  },

  async save(options, { contracts, compilations }) {
    const config = prepareConfig(options);

    await fse.ensureDir(config.contracts_build_directory);

    if (options.db && options.db.enabled === true && contracts.length > 0) {
      // currently if Truffle Db fails to load, getTruffleDb returns `null`
      const Db = getTruffleDb();

      if (Db) {
        debug("saving to @truffle/db");
        const db = Db.connect(config.db);
        const project = await Db.Project.initialize({
          db,
          project: {
            directory: config.working_directory
          }
        });
        ({ contracts, compilations } = await project.loadCompile({
          result: { contracts, compilations }
        }));
      }
    }

    const artifacts = contracts.map(Shims.NewToLegacy.forContract);
    await config.artifactor.saveAll(artifacts);

    return { contracts, compilations };
  },

  async assignNames(options, { contracts }) {
    // currently if Truffle Db fails to load, getTruffleDb returns `null`
    const Db = getTruffleDb();

    const config = prepareConfig(options);

    if (!Db || !config.db || !config.db.enabled || contracts.length === 0) {
      return;
    }

    const db = Db.connect(config.db);
    const project = await Db.Project.initialize({
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
