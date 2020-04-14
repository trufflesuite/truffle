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

    const resolver = options.resolver;
    let allPaths, updates;
    const allSources = {};
    const compilationTargets = [];
    // Fetch the whole contract set
    findContracts(options.contracts_directory)
      .then(sourcePaths => {
        allPaths = sourcePaths;
        // Solidity test files might have been injected. Include them in the known set.
        options.paths.forEach(_path => {
          if (!allPaths.includes(_path)) {
            allPaths.push(_path);
          }
        });
        updates = this.convert_to_absolute_paths(
          options.paths,
          options.base_path
        ).sort();
        allPaths = this.convert_to_absolute_paths(
          allPaths,
          options.base_path
        ).sort();

        // Load compiler
        const supplierOptions = {
          parser: options.parser,
          events: options.events,
          solcConfig: options.compilers.solc
        };
        const supplier = new CompilerSupplier(supplierOptions);
        return supplier.load();
      })
      .then(async ({ solc, parserSolc }) => {
        // Get all the source code
        const resolved = await this.resolveAllSources(
          resolver,
          allPaths,
          solc,
          parserSolc
        );
        // Generate hash of all sources including external packages - passed to solc inputs.
        const resolvedPaths = Object.keys(resolved);
        resolvedPaths.forEach(file => {
          // Don't throw vyper files into solc!
          if (path.extname(file) !== ".vy")
            allSources[file] = resolved[file].body;
        });

        // Exit w/out minimizing if we've been asked to compile everything, or nothing.
        if (this.listsEqual(options.paths, allPaths)) {
          return callback(null, allSources, {});
        } else if (!options.paths.length) {
          return callback(null, {}, {});
        }

        // Seed compilationTargets with known updates
        updates.forEach(update => compilationTargets.push(update));

        // While there are updated files in the queue, we take each one
        // and search the entire file corpus to find any sources that import it.
        // Those sources are added to list of compilation targets as well as
        // the update queue because their own ancestors need to be discovered.
        while (updates.length > 0) {
          const currentUpdate = updates.shift();
          const files = allPaths.slice();

          // While files: dequeue and inspect their imports
          while (files.length > 0) {
            const currentFile = files.shift();

            // Ignore targets already selected.
            if (compilationTargets.includes(currentFile)) {
              continue;
            }

            let imports;
            try {
              imports = await getImports(
                currentFile,
                resolved[currentFile],
                solc,
                parserSolc
              );
            } catch (err) {
              err.message = `Error parsing ${currentFile}: ${err.message}`;
              throw err;
            }

            // If file imports a compilation target, add it
            // to list of updates and compilation targets
            if (imports.includes(currentUpdate)) {
              updates.push(currentFile);
              compilationTargets.push(currentFile);
            }
          }
        }

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
  },

  listsEqual(listA, listB) {
    const a = listA.sort();
    const b = listB.sort();

    return JSON.stringify(a) === JSON.stringify(b);
  },

  convert_to_absolute_paths(paths, base) {
    return paths.map(p => {
      // If it's anabsolute paths, leave it alone.
      if (path.isAbsolute(p)) return p;

      // If it's not explicitly relative, then leave it alone (i.e., it's a module).
      if (!Common.Profiler.isExplicitlyRelative(p)) return p;

      // Path must be explicitly releative, therefore make it absolute.
      return path.resolve(path.join(base, p));
    });
  }
};
