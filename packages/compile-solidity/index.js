const debug = require("debug")("compile"); // eslint-disable-line no-unused-vars
const path = require("path");
const expect = require("@truffle/expect");
const findContracts = require("@truffle/contract-sources");
const Config = require("@truffle/config");
const Profiler = require("./profiler");
const CompilerSupplier = require("./compilerSupplier");
const { run } = require("./run");

const normalizeOptions = options => {
  if (options.logger === undefined) options.logger = console;

  expect.options(options, ["contracts_directory", "compilers"]);
  expect.options(options.compilers, ["solc"]);

  options.compilers.solc.settings.evmVersion =
    options.compilers.solc.settings.evmVersion ||
    options.compilers.solc.evmVersion;
  options.compilers.solc.settings.optimizer =
    options.compilers.solc.settings.optimizer ||
    options.compilers.solc.optimizer ||
    {};

  // Grandfather in old solc config
  if (options.solc) {
    options.compilers.solc.settings.evmVersion = options.solc.evmVersion;
    options.compilers.solc.settings.optimizer = options.solc.optimizer;
  }

  // Certain situations result in `{}` as a value for compilationTargets
  // Previous implementations treated any value lacking `.length` as equivalent
  // to `[]`
  if (!options.compilationTargets || !options.compilationTargets.length) {
    options.compilationTargets = [];
  }

  return options;
};

const analyzeImports = async ({ paths, options }) => {
  const dependencies = {};
  for (const path of paths) {
    const config = Config.default().merge(options);
    const { allSources } = await Profiler.requiredSourcesForSingleFile(
      config.with({
        path,
        base_path: options.contracts_directory,
        resolver: options.resolver
      })
    );
    dependencies[path] = [allSources];
  }

  let pragmas;
  // key is a source - value is an array of pragmas
  for (const compilationSet of Object.keys(dependencies)) {
    pragmas = await getPragmas(compilationSet);
  }

  let bestSolcVersions;
  // key is source - value is best satisfying version of Solidity compiler
  for (const pragmaSet of pragmas) {
    bestSolcVersions = determineBestSatisfyingSolcVersion(pragmaSet);
  }

  let compilations;
  for (const version of bestSolcVersions) {
    const compilation = await run(
      allSources,
      normalizeOptions(options)
    );
    const { name, version } = compiler;
    return compilation.contracts.length > 0
      ? {
          compilations: [
            {
              sourceIndexes,
              contracts,
              compiler: { name, version }
            }
          ]
        }
      : { compilations: [] };
  }
};

const Compile = {
  // this takes an object with keys being the name and values being source
  // material as well as an options object
  async sources({ sources, options }) {
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
      options: Config.default().merge(options)
    });
  },

  async necessary(options) {
    options.logger = options.logger || console;

    const paths = await Profiler.updated(options);

    return await Compile.sourcesWithDependencies({
      paths,
      options: Config.default().merge(options)
    });
  },

  // this takes an array of paths and options
  async sourcesWithDependencies({ paths, options }) {
    if (options.analyzeImports) {
      await analyzeImports({ paths, options });
    }
    options.logger = options.logger || console;
    options.contracts_directory = options.contracts_directory || process.cwd();

    expect.options(options, [
      "working_directory",
      "contracts_directory",
      "resolver"
    ]);

    const config = Config.default().merge(options);
    const { allSources, compilationTargets } = await Profiler.requiredSources(
      config.with({
        paths,
        base_path: options.contracts_directory,
        resolver: options.resolver
      })
    );

    const hasTargets = compilationTargets.length;

    hasTargets
      ? Compile.display(compilationTargets, options)
      : Compile.display(allSources, options);

    // when there are no sources, don't call run
    if (Object.keys(allSources).length === 0) {
      return { compilations: [] };
    }

    options.compilationTargets = compilationTargets;
    const { sourceIndexes, contracts, compiler } = await run(
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
              contracts,
              compiler: { name, version }
            }
          ]
        }
      : { compilations: [] };
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
          if (contract.match(blacklistRegex)) return;
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
