const debug = require("debug")("compile");
const findContracts = require("@truffle/contract-sources");
const Config = require("@truffle/config");
const Profiler = require("./profiler");
const CompilerSupplier = require("./compilerSupplier");
const { run } = require("./run");
const { normalizeOptions } = require("./normalizeOptions");
const { compileWithPragmaAnalysis } = require("./compileWithPragmaAnalysis");
const { reportSources } = require("./reportSources");
const expect = require("@truffle/expect");
const partition = require("lodash.partition");
const fs = require("fs-extra");

async function compileYulPaths(yulPaths, options) {
  let yulCompilations = [];
  for (const path of yulPaths) {
    const yulOptions = options.with({ compilationTargets: [path] });
    //load up Yul sources, since they weren't loaded up earlier
    //(we'll just use FS for this rather than going through the resolver,
    //for simplicity, since there are no imports to worry about)
    const yulSource = fs.readFileSync(path, { encoding: "utf8" });
    debug("Compiling Yul");
    const compilation = await run({ [path]: yulSource }, yulOptions, "Yul");
    debug("Yul compiled successfully");

    // returns CompilerResult - see @truffle/compile-common
    if (compilation.contracts.length > 0) {
      yulCompilations.push(compilation);
    }
  }
  if (yulPaths.length > 0 && !options.quiet) {
    //replacement for individual Yul warnings
    options.logger.log(
      "> Warning: Yul is still experimental. Avoid using it in live deployments."
    );
  }
  return yulCompilations;
}

const Compile = {
  // this takes an object with keys being the name and values being source
  // material as well as an options object
  async sources({ sources, options }) {
    options = Config.default().merge(options);
    options = normalizeOptions(options);
    //note: "solidity" here includes JSON as well!
    const [yulNames, solidityNames] = partition(Object.keys(sources), name =>
      name.endsWith(".yul")
    );
    const soliditySources = Object.assign(
      {},
      ...solidityNames.map(name => ({ [name]: sources[name] }))
    );
    let solidityCompilations = [];
    let yulCompilations = [];
    if (solidityNames.length > 0) {
      debug("Compiling Solidity (specified sources)");
      const compilation = await run(soliditySources, options);
      debug("Compiled Solidity");
      if (compilation.contracts.length > 0) {
        solidityCompilations = [compilation];
      }
    }
    for (const name of yulNames) {
      debug("Compiling Yul (specified sources)");
      const compilation = await run({ [name]: sources[name] }, options, "Yul");
      debug("Compiled Yul");
      yulCompilations.push(compilation);
    }
    return { compilations: [...solidityCompilations, ...yulCompilations] };
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
    options = normalizeOptions(options);

    //note: solidityPaths here still includes JSON as well!
    const [yulPaths, solidityPaths] = partition(paths, path =>
      path.endsWith(".yul")
    );

    debug("invoking profiler");
    //only invoke profiler on Solidity, not Yul
    const { allSources, compilationTargets } = await Profiler.requiredSources(
      options.with({
        paths: solidityPaths,
        base_path: options.contracts_directory,
        resolver: options.resolver
      })
    );
    debug("compilationTargets: %O", compilationTargets);

    // we can exit if there are no Solidity/Yul files to compile since
    // it indicates that we only have Vyper-related JSON
    const solidityTargets = compilationTargets.filter(fileName =>
      fileName.endsWith(".sol")
    );
    if (solidityTargets.length === 0 && yulPaths.length === 0) {
      return { compilations: [] };
    }

    reportSources({ paths: [...compilationTargets, ...yulPaths], options });

    let solidityCompilations = [];
    // only call run if there are sources to run on!
    if (Object.keys(allSources).length > 0) {
      const solidityOptions = options.with({ compilationTargets });
      debug("Compiling Solidity");
      const compilation = await run(allSources, solidityOptions);
      debug("Solidity compiled successfully");

      // returns CompilerResult - see @truffle/compile-common
      if (compilation.contracts.length > 0) {
        solidityCompilations = [compilation];
      }
    }

    const yulCompilations = await compileYulPaths(yulPaths, options);

    return {
      compilations: [...solidityCompilations, ...yulCompilations]
    };
  },

  async sourcesWithPragmaAnalysis({ paths, options }) {
    return compileWithPragmaAnalysis({ paths, options });
  }
};

module.exports = {
  Compile,
  CompilerSupplier
};
