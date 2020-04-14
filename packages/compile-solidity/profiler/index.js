// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.

const path = require("path");
const CompilerSupplier = require("../compilerSupplier");
const expect = require("@truffle/expect");
const findContracts = require("@truffle/contract-sources");
const debug = require("debug")("compile:profiler");
const Common = require("@truffle/compile-common");
const { getImports } = require("./getImports");

module.exports = {
  async updated(options, callback) {
    const callbackPassed = typeof callback === "function";

    expect.options(options, ["resolver"]);

    const { contracts_directory, contracts_build_directory } = options;

    async function getFiles() {
      if (options.files) {
        return options.files;
      } else {
        return findContracts(contracts_directory);
      }
    }

    try {
      const updatedFiles = await Common.Profiler.updated({
        getFiles,
        contractsBuildDirectory: contracts_build_directory
      });

      if (callbackPassed) {
        callback(null, updatedFiles);
      } else {
        return updatedFiles;
      }
    } catch (error) {
      if (callbackPassed) {
        callback(error);
      } else {
        throw error;
      }
    }
  },

  // Returns the minimal set of sources to pass to solc as compilations targets,
  // as well as the complete set of sources so solc can resolve the comp targets' imports.
  required_sources(options, callback) {
    expect.options(options, ["paths", "base_path", "resolver"]);

    // Load compiler
    const supplierOptions = {
      parser: options.parser,
      events: options.events,
      solcConfig: options.compilers.solc
    };
    const supplier = new CompilerSupplier(supplierOptions);

    const resolver = options.resolver;
    // Fetch the whole contract set
    supplier
      .load()
      .then(async ({ solc, parserSolc }) => {
        const parserCompiler = parserSolc || solc;

        const {
          allSources,
          compilationTargets
        } = await Common.Profiler.requiredSources({
          paths: options.paths,
          basePath: options.base_path,
          resolver,
          findContracts: () => findContracts(options.contracts_directory),
          shouldIncludePath: file => path.extname(file) !== ".vy",
          getImports: (current, result) =>
            getImports(current, result, parserCompiler)
        });

        callback(null, allSources, compilationTargets);
      })
      .catch(error => {
        callback(error);
      });
  }
};
