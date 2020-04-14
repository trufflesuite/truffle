// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.

const path = require("path");
const CompilerSupplier = require("../compilerSupplier");
const expect = require("@truffle/expect");
const findContracts = require("@truffle/contract-sources");
const semver = require("semver");
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

    let sourceFilesArtifacts = {};
    let sourceFilesArtifactsUpdatedTimes = {};

    try {
      const sourceFiles = await getFiles();
      sourceFilesArtifacts = Common.Profiler.readAndParseArtifactFiles(
        sourceFiles,
        contracts_build_directory
      );
      sourceFilesArtifactsUpdatedTimes = Common.Profiler.minimumUpdatedTimePerSource(
        sourceFilesArtifacts
      );
      const updatedFiles = Common.Profiler.findUpdatedFiles(
        sourceFilesArtifacts,
        sourceFilesArtifactsUpdatedTimes
      );
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
        const {
          allSources,
          compilationTargets
        } = await Common.Profiler.requiredSources({
          paths: options.paths,
          basePath: options.base_path,
          findContracts: () => findContracts(options.contracts_directory),
          resolveAllSources: allPaths =>
            this.resolveAllSources(resolver, allPaths, solc, parserSolc),
          shouldIncludePath: file => path.extname(file) !== ".vy",
          getImports: async (currentFile, resolvedFile) => {
            try {
              return await getImports(
                currentFile,
                resolvedFile,
                solc,
                parserSolc
              );
            } catch (err) {
              err.message = `Error parsing ${currentFile}: ${err.message}`;
              throw err;
            }
          }
        });

        callback(null, allSources, compilationTargets);
      })
      .catch(error => {
        callback(error);
      });
  },

  // Resolves sources in several async passes. For each resolved set it detects unknown
  // imports from external packages and adds them to the set of files to resolve.
  async resolveAllSources(resolver, initialPaths, solc, parserSolc) {
    return await Common.Profiler.resolveAllSources(
      resolver,
      initialPaths,
      async (filePath, result) => {
        // Inspect the imports
        try {
          return await getImports(filePath, result, solc, parserSolc);
        } catch (err) {
          if (err.message.includes("requires different compiler version")) {
            const contractSolcPragma = err.message.match(
              /pragma solidity[^;]*/gm
            );
            // if there's a match provide the helpful error, otherwise return solc's error output
            if (contractSolcPragma) {
              const contractSolcVer = contractSolcPragma[0];
              const configSolcVer = semver.valid(solc.version());
              err.message = err.message.concat(
                `\n\nError: Truffle is currently using solc ${configSolcVer}, but one or more of your contracts specify "${contractSolcVer}".\nPlease update your truffle config or pragma statement(s).\n(See https://truffleframework.com/docs/truffle/reference/configuration#compiler-configuration for information on\nconfiguring Truffle to use a specific solc compiler version.)\n`
              );
            }
          }
          throw err;
        }
      }
    );
  }
};
