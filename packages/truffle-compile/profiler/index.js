// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.

const path = require("path");
const async = require("async");
const fse = require("fs-extra");
const Parser = require("../parser");
const CompilerSupplier = require("../compilerSupplier");
const expect = require("truffle-expect");
const find_contracts = require("truffle-contract-sources");
const semver = require("semver");
const debug = require("debug")("compile:profiler");

module.exports = {
  updated(options, callback) {
    expect.options(options, ["resolver"]);

    const { contracts_directory, contracts_build_directory } = options;

    async function getFiles() {
      if (options.files) {
        return options.files;
      } else {
        return find_contracts(contracts_directory);
      }
    }

    const sourceFilesArtifacts = {};
    const sourceFilesArtifactsUpdatedTimes = {};

    const updatedFiles = [];

    getFiles()
      .then(files => {
        // Get all the source files and create an object out of them.
        // Use an object for O(1) access.
        files.forEach(sourceFile => {
          sourceFilesArtifacts[sourceFile] = [];
        });
        return;
      })
      .then(() => {
        // Get all the artifact files, and read them, parsing them as JSON
        let buildFiles;
        try {
          buildFiles = fse.readdirSync(contracts_build_directory);
        } catch (error) {
          // The build directory may not always exist.
          if (error.message.includes("ENOENT: no such file or directory")) {
            // Ignore it.
            buildFiles = [];
          } else {
            throw error;
          }
        }

        buildFiles = buildFiles.filter(file => path.extname(file) === ".json");
        const jsonData = buildFiles.map(file => {
          const body = fse.readFileSync(
            path.join(contracts_build_directory, file),
            "utf8"
          );
          return { file, body };
        });

        for (let i = 0; i < jsonData.length; i++) {
          try {
            const data = JSON.parse(jsonData[i].body);

            // In case there are artifacts from other source locations.
            if (sourceFilesArtifacts[data.sourcePath] == null) {
              sourceFilesArtifacts[data.sourcePath] = [];
            }

            sourceFilesArtifacts[data.sourcePath].push(data);
          } catch (error) {
            // JSON.parse throws SyntaxError objects
            if (e instanceof SyntaxError) {
              throw new Error("Problem parsing artifact: " + jsonData[i].file);
            } else {
              throw error;
            }
          }
        }
        return;
      })
      .then(() => {
        // Get the minimum updated time for all of a source file's artifacts
        // (note: one source file might have multiple artifacts).
        Object.keys(sourceFilesArtifacts).forEach(sourceFile => {
          const artifacts = sourceFilesArtifacts[sourceFile];

          sourceFilesArtifactsUpdatedTimes[sourceFile] = artifacts.reduce(
            (minimum, current) => {
              const updatedAt = new Date(current.updatedAt).getTime();

              if (updatedAt < minimum) {
                return updatedAt;
              }
              return minimum;
            },
            Number.MAX_SAFE_INTEGER
          );

          // Empty array?
          if (
            sourceFilesArtifactsUpdatedTimes[sourceFile] ===
            Number.MAX_SAFE_INTEGER
          ) {
            sourceFilesArtifactsUpdatedTimes[sourceFile] = 0;
          }
        });
        return;
      })
      .then(() => {
        // Stat all the source files, getting there updated times, and comparing them to
        // the artifact updated times.
        const sourceFiles = Object.keys(sourceFilesArtifacts);

        let sourceFileStats;
        sourceFileStats = sourceFiles.map(file => {
          try {
            return fse.statSync(file);
          } catch (error) {
            // Ignore it. This means the source file was removed
            // but the artifact file possibly exists. Return null
            // to signfy that we should ignore it.
            return null;
          }
        });

        sourceFiles.forEach((sourceFile, index) => {
          const sourceFileStat = sourceFileStats[index];

          // Ignore updating artifacts if source file has been removed.
          if (sourceFileStat == null) return;

          const artifactsUpdatedTime =
            sourceFilesArtifactsUpdatedTimes[sourceFile] || 0;
          const sourceFileUpdatedTime = (
            sourceFileStat.mtime || sourceFileStat.ctime
          ).getTime();

          if (sourceFileUpdatedTime > artifactsUpdatedTime) {
            updatedFiles.push(sourceFile);
          }
        });
        return callback(null, updatedFiles);
      })
      .catch(error => {
        callback(error);
      });
  },

  // Returns the minimal set of sources to pass to solc as compilations targets,
  // as well as the complete set of sources so solc can resolve the comp targets' imports.
  required_sources(options, callback) {
    const self = this;

    expect.options(options, ["paths", "base_path", "resolver"]);

    const resolver = options.resolver;

    // Fetch the whole contract set
    find_contracts(options.contracts_directory, (err, allPaths) => {
      if (err) return callback(err);

      // Solidity test files might have been injected. Include them in the known set.
      options.paths.forEach(_path => {
        if (!allPaths.includes(_path)) {
          allPaths.push(_path);
        }
      });

      const updates = self
        .convert_to_absolute_paths(options.paths, options.base_path)
        .sort();
      allPaths = self
        .convert_to_absolute_paths(allPaths, options.base_path)
        .sort();

      const allSources = {};
      const compilationTargets = [];

      // Load compiler
      const supplier = new CompilerSupplier(options.compilers.solc);
      supplier
        .load()
        .then(async solc => {
          // Get all the source code
          const resolved = await self.resolveAllSources(
            resolver,
            allPaths,
            solc
          );
          // Generate hash of all sources including external packages - passed to solc inputs.
          const resolvedPaths = Object.keys(resolved);
          resolvedPaths.forEach(file => {
            // Don't throw vyper files into solc!
            if (path.extname(file) !== ".vy")
              allSources[file] = resolved[file].body;
          });

          // Exit w/out minimizing if we've been asked to compile everything, or nothing.
          if (self.listsEqual(options.paths, allPaths)) {
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
                imports = self.getImports(
                  currentFile,
                  resolved[currentFile],
                  solc
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
        .catch(callback);
    });
  },

  // Resolves sources in several async passes. For each resolved set it detects unknown
  // imports from external packages and adds them to the set of files to resolve.
  async resolveAllSources(resolver, initialPaths, solc) {
    const self = this;
    const mapping = {};
    const allPaths = initialPaths.slice();

    // Begin generateMapping
    function generateMapping(finished) {
      const promises = [];

      // Dequeue all the known paths, generating resolver promises,
      // We'll add paths if we discover external package imports.
      while (allPaths.length) {
        let file;
        let parent = null;

        const candidate = allPaths.shift();

        // Some paths will have been extracted as imports from a file
        // and have information about their parent location we need to track.
        if (typeof candidate === "object") {
          file = candidate.file;
          parent = candidate.parent;
        } else {
          file = candidate;
        }
        const promise = new Promise((accept, reject) => {
          resolver.resolve(file, parent, (err, body, absolutePath, source) => {
            err ? reject(err) : accept({ file: absolutePath, body, source });
          });
        });
        promises.push(promise);
      }

      // Resolve everything known and add it to the map, then inspect each file's
      // imports and add those to the list of paths to resolve if we don't have it.
      Promise.all(promises)
        .then(results => {
          // Generate the sources mapping
          results.forEach(
            item => (mapping[item.file] = Object.assign({}, item))
          );

          // Queue unknown imports for the next resolver cycle
          while (results.length) {
            const result = results.shift();

            // Inspect the imports
            let imports;
            try {
              imports = self.getImports(result.file, result, solc);
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
              return finished(err);
            }

            // Detect unknown external packages / add them to the list of files to resolve
            // Keep track of location of this import because we need to report that.
            imports.forEach(item => {
              if (!mapping[item])
                allPaths.push({ file: item, parent: result.file });
            });
          }
        })
        .catch(finished)
        .then(finished);
    }
    // End generateMapping

    return new Promise((resolve, reject) => {
      async.whilst(() => allPaths.length, generateMapping, error => {
        if (error) reject(new Error(error));
        resolve(mapping);
      });
    });
  },

  getImports(file, { body, source }, solc) {
    const self = this;

    // No imports in vyper!
    if (path.extname(file) === ".vy") return [];

    const imports = Parser.parseImports(body, solc);

    // Convert explicitly relative dependencies of modules back into module paths.
    return imports.map(dependencyPath =>
      self.isExplicitlyRelative(dependencyPath)
        ? source.resolve_dependency_path(file, dependencyPath)
        : dependencyPath
    );
  },

  listsEqual(listA, listB) {
    const a = listA.sort();
    const b = listB.sort();

    return JSON.stringify(a) === JSON.stringify(b);
  },

  convert_to_absolute_paths(paths, base) {
    const self = this;
    return paths.map(p => {
      // If it's anabsolute paths, leave it alone.
      if (path.isAbsolute(p)) return p;

      // If it's not explicitly relative, then leave it alone (i.e., it's a module).
      if (!self.isExplicitlyRelative(p)) return p;

      // Path must be explicitly releative, therefore make it absolute.
      return path.resolve(path.join(base, p));
    });
  },

  isExplicitlyRelative(import_path) {
    return import_path.indexOf(".") === 0;
  }
};
