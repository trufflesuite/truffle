const debug = require("debug")("compile");
const path = require("path");
const findContracts = require("@truffle/contract-sources");
const Config = require("@truffle/config");
const Profiler = require("./profiler");
const CompilerSupplier = require("./compilerSupplier");
const { run } = require("./run");
const { normalizeOptions } = require("./normalizeOptions");
const { compileWithPragmaAnalysis } = require("./compileWithPragmaAnalysis");
const expect = require("@truffle/expect");

const Compile = {
  // this takes an object with keys being the name and values being source
  // material as well as an options object
  async sources({ sources, options }) {
    options = Config.default().merge(options);
    const compilation = await run(sources, normalizeOptions(options));
    return compilation.contracts.length > 0
      ? { compilations: [compilation] }
      : { compilations: [] };
  },

  async all(options) {
    const paths = [
      ...new Set([
        ...(await findContracts(options.contracts_directory)),
        ...(options.files || [])
      ])
    ];

    return await Compile.sourcesWithDependencies({
      paths,
      options
    });
  },

  async necessary(options) {
    options.logger = options.logger || console;

    const paths = await Profiler.updated(options);

    return await Compile.sourcesWithDependencies({
      paths,
      options
    });
  },

  // this takes an array of paths and options
  async sourcesWithDependencies({ paths, options }) {
    if (options.compilers.solc.version === "pragma") {
      return this.sourcesWithPragmaAnalysis({ paths, options });
    }

    options.logger = options.logger || console;
    options.contracts_directory = options.contracts_directory || process.cwd();

    debug("paths: %O", paths);

    expect.options(options, [
      "working_directory",
      "contracts_directory",
      "resolver"
    ]);

    options = Config.default().merge(options);

    debug("invoking profiler");
    const { allSources, compilationTargets } = await Profiler.requiredSources(
      options.with({
        paths,
        base_path: options.contracts_directory,
        resolver: options.resolver
      })
    );
    debug("allSources: %O", allSources);
    debug("compilationTargets: %O", compilationTargets);

    // we can exit if there are no Solidity files to compile since
    // it indicates that we only have Vyper-related JSON
    const solidityTargets = compilationTargets.filter(fileName =>
      fileName.endsWith(".sol")
    );
    if (solidityTargets.length === 0) {
      return { compilations: [] };
    }

    Compile.display(compilationTargets, options);

    // when there are no sources, don't call run
    if (Object.keys(allSources).length === 0) {
      return { compilations: [] };
    }

    options.compilationTargets = compilationTargets;
    const { sourceIndexes, sources, contracts, compiler } = await run(
      allSources,
      normalizeOptions(options)
    );

    const { name, version } = compiler;
    // returns CompilerResult - see @truffle/compile-common
    return contracts.length > 0
      ? {
          compilations: [
            {
              sourceIndexes,
              sources,
              contracts,
              compiler: { name, version }
            }
          ]
        }
      : { compilations: [] };
  },

  async sourcesWithPragmaAnalysis({ paths, options }) {
    return compileWithPragmaAnalysis({ paths, options });
  },

  display(paths, options) {
    if (options.quiet !== true) {
      if (!Array.isArray(paths)) {
        paths = Object.keys(paths);
      }

      const blacklistRegex = /^truffle\//;

      const sources = paths
        .sort()
        .map(contract => {
          if (path.isAbsolute(contract)) {
            contract =
              "." +
              path.sep +
              path.relative(options.working_directory, contract);
          }
          if (contract.match(blacklistRegex) || contract.endsWith(".json")) {
            return;
          }
          return contract;
        })
        .filter(contract => contract);
      options.events.emit("compile:sourcesToCompile", {
        sourceFileNames: sources
      });
    }
  }
};

module.exports = {
  Compile,
  CompilerSupplier
};
