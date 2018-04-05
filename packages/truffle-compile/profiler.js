// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.

var path = require("path");
var async = require("async");
var fs = require("fs");
var Parser = require("./parser");
var CompileError = require("./compileerror");
var expect = require("truffle-expect");
var find_contracts = require("truffle-contract-sources");
var debug = require("debug")("compile:profiler");

module.exports = {
  updated: function(options, callback) {
    var self = this;

    expect.options(options, [
      "resolver"
    ]);

    var contracts_directory = options.contracts_directory;
    var build_directory = options.contracts_build_directory;

    function getFiles(done) {
      if (options.files) {
        done(null, options.files);
      } else {
        find_contracts(contracts_directory, done);
      }
    }

    var sourceFilesArtifacts = {};
    var sourceFilesArtifactsUpdatedTimes = {};

    var updatedFiles = [];

    async.series([
      // Get all the source files and create an object out of them.
      function(c) {
        getFiles(function(err, files) {
          if (err) return c(err);

          // Use an object for O(1) access.
          files.forEach(function(sourceFile) {
            sourceFilesArtifacts[sourceFile] = [];
          });

          c();
        })
      },
      // Get all the artifact files, and read them, parsing them as JSON
      function(c) {
        fs.readdir(build_directory, function(err, build_files) {
          if (err) {
            // The build directory may not always exist.
            if (err.message.indexOf("ENOENT: no such file or directory") >= 0) {
              // Ignore it.
              build_files = [];
            } else {
              return c(err);
            }
          }

          build_files = build_files.filter(function(build_file) {
            return path.extname(build_file) == ".json";
          });

          async.map(build_files, function(buildFile, finished) {
            fs.readFile(path.join(build_directory, buildFile), "utf8", function(err, body) {
              if (err) return finished(err);
              finished(null, body);
            });
          }, function(err, jsonData) {
            if (err) return c(err);

            try {
              for (var i = 0; i < jsonData.length; i++) {
                var data = JSON.parse(jsonData[i]);

                // In case there are artifacts from other source locations.
                if (sourceFilesArtifacts[data.sourcePath] == null) {
                  sourceFilesArtifacts[data.sourcePath] = [];
                }

                sourceFilesArtifacts[data.sourcePath].push(data);
              }
            } catch (e) {
              return c(e);
            }

            c();
          });
        });
      },
      function(c) {
        // Get the minimum updated time for all of a source file's artifacts
        // (note: one source file might have multiple artifacts).
        Object.keys(sourceFilesArtifacts).forEach(function(sourceFile) {
          var artifacts = sourceFilesArtifacts[sourceFile];

          sourceFilesArtifactsUpdatedTimes[sourceFile] = artifacts.reduce(function(minimum, current) {
            var updatedAt = new Date(current.updatedAt).getTime();

            if (updatedAt < minimum) {
              return updatedAt;
            }
            return minimum;
          }, Number.MAX_SAFE_INTEGER);

          // Empty array?
          if (sourceFilesArtifactsUpdatedTimes[sourceFile] == Number.MAX_SAFE_INTEGER) {
            sourceFilesArtifactsUpdatedTimes[sourceFile] = 0;
          }
        });

        c();
      },
      // Stat all the source files, getting there updated times, and comparing them to
      // the artifact updated times.
      function(c) {
        var sourceFiles = Object.keys(sourceFilesArtifacts);

        async.map(sourceFiles, function(sourceFile, finished) {
          fs.stat(sourceFile, function(err, stat) {
            if (err) {
              // Ignore it. This means the source file was removed
              // but the artifact file possibly exists. Return null
              // to signfy that we should ignore it.
              stat = null;
            }
            finished(null, stat);
          });
        }, function(err, sourceFileStats) {
          if (err) return callback(err);

          sourceFiles.forEach(function(sourceFile, index) {
            var sourceFileStat = sourceFileStats[index];

            // Ignore updating artifacts if source file has been removed.
            if (sourceFileStat == null) {
              return;
            }

            var artifactsUpdatedTime = sourceFilesArtifactsUpdatedTimes[sourceFile] || 0;
            var sourceFileUpdatedTime = (sourceFileStat.mtime || sourceFileStat.ctime).getTime();

            if (sourceFileUpdatedTime > artifactsUpdatedTime) {
              updatedFiles.push(sourceFile);
            }
          });

          c();
        });
      }
    ], function(err) {
      callback(err, updatedFiles);
    });
  },

  // Returns the minimal set of sources to pass to solc as compilations targets,
  // as well as the complete set of sources so solc can resolve the comp targets' imports.
  required_sources: function(options, callback) {
    var self = this;

    expect.options(options, [
      "paths",
      "base_path",
      "resolver"
    ]);

    var resolver = options.resolver;

    // Fetch the whole contract set
    find_contracts(options.contracts_directory, (err, allPaths) => {
      if(err) return callback(err);

      // Solidity test files might have been injected. Include them in the known set.
      options.paths.forEach(_path => {
        if (!allPaths.includes(_path)) {
          allPaths.push(_path)
        }
      });

      var updates = self.convert_to_absolute_paths(options.paths, options.base_path).sort();
      var allPaths = self.convert_to_absolute_paths(allPaths, options.base_path).sort();

      var allSources = {};
      var compilationTargets = [];

      // Get all the source code
      self.resolveAllSources(resolver, allPaths, (err, resolved) => {
        if(err) return callback(err);

        // Generate hash of all sources including external packages - passed to solc inputs.
        var resolvedPaths = Object.keys(resolved);
        resolvedPaths.forEach(file => allSources[file] = resolved[file].body)

        // Exit w/out minimizing if we've been asked to compile everything, or nothing.
        if (self.listsEqual(options.paths, allPaths)){
          return callback(null, allSources, {});
        } else if (!options.paths.length){
          return callback(null, {}, {});
        }

        // Seed compilationTargets with known updates
        updates.forEach(update => compilationTargets.push(update));

        // While there are updated files in the queue, we take each one
        // and search the entire file corpus to find any sources that import it.
        // Those sources are added to list of compilation targets as well as
        // the update queue because their own ancestors need to be discovered.
        async.whilst(() => updates.length > 0, updateFinished => {
          var currentUpdate = updates.shift();
          var files = allPaths.slice();

          // While files: dequeue and inspect their imports
          async.whilst(() => files.length > 0, fileFinished => {

            var currentFile = files.shift();

            // Ignore targets already selected.
            if (compilationTargets.includes(currentFile)){
              return fileFinished();
            }

            var imports;
            try {
              imports = self.getImports(currentFile, resolved[currentFile]);
            } catch (err) {
              err.message = "Error parsing " + currentFile + ": " + e.message;
              return fileFinished(err);
            }

            // If file imports a compilation target, add it
            // to list of updates and compilation targets
            if (imports.includes(currentUpdate)){
              updates.push(currentFile);
              compilationTargets.push(currentFile);
            }

            fileFinished();

          }, err => updateFinished(err));
        }, err => (err) ? callback(err) : callback(null, allSources, compilationTargets))
      })
    })
  },

  // Resolves sources in several async passes. For each resolved set it detects unknown
  // imports from external packages and adds them to the set of files to resolve.
  resolveAllSources: function(resolver, initialPaths, callback){
    var self = this;
    var mapping = {};
    var allPaths = initialPaths.slice();

    function generateMapping(finished){
      var promises = [];

      // Dequeue all the known paths, generating resolver promises,
      // We'll add paths if we discover external package imports.
      while(allPaths.length){
        var file = allPaths.shift();

        var promise = new Promise((accept, reject)=> {
          resolver.resolve(file, null, (err, body, absolutePath, source) => {
            (err)
              ? reject(err)
              : accept({ file: absolutePath, body: body, source: source });
          });
        });
        promises.push(promise);
      };

      // Resolve everything known and add it to the map, then inspect each file's
      // imports and add those to the list of paths to resolve if we don't have it.
      Promise.all(promises).then(results => {

        // Generate the sources mapping
        results.forEach(item => mapping[item.file] = Object.assign({}, item));

        // Queue unknown imports for the next resolver cycle
        while(results.length){
          var result = results.shift();

          // Inspect the imports
          var imports;
          try {
            imports = self.getImports(result.file, result);
          } catch (err) {
            err.message = "Error parsing " + result[file] + ": " + err.message;
            return finished(err);
          }

          // Detect unknown external packages / add them to the list of files to resolve
          imports.forEach(item => (!mapping[item]) ? allPaths.push(item) : null)
        };
        finished()
      }).catch(err => { throw new Error(err) });
    }

    async.whilst(
      () => allPaths.length,
      generateMapping,
      (err) => (err) ? callback(err) : callback(null, mapping)
    );
  },

  getImports: function(file, resolved){
    var self = this;

    var imports = Parser.parseImports(resolved.body);

    // Convert explicitly relative dependencies of modules back into module paths.
    return imports.map(dependencyPath => {
      return (self.isExplicitlyRelative(dependencyPath))
        ? resolved.source.resolve_dependency_path(file, dependencyPath)
        : dependencyPath;
    });
  },

  listsEqual: function(listA, listB){
    var a = listA.sort();
    var b = listB.sort();

    return JSON.stringify(a) === JSON.stringify(b);
  },

  convert_to_absolute_paths: function(paths, base) {
    var self = this;
    return paths.map(function(p) {
      // If it's anabsolute paths, leave it alone.
      if (path.isAbsolute(p)) return p;

      // If it's not explicitly relative, then leave it alone (i.e., it's a module).
      if (!self.isExplicitlyRelative(p)) return p;

      // Path must be explicitly releative, therefore make it absolute.
      return path.resolve(path.join(base, p));
    });
  },

  isExplicitlyRelative: function(import_path) {
    return import_path.indexOf(".") == 0;
  },

  // Parse all source files in the directory and output the names of contracts and their source paths
  // directory can either be a directory or array of files.
  defined_contracts: function(directory, callback) {
    function getFiles(callback) {
      if (Array.isArray(directory)) {
        callback(null, directory);
      } else {
        find_contracts(directory, callback);
      }
    }

    getFiles(function(err, files) {
      if (err) return callback(err);

      var promises = files.map(function(file) {
        return new Promise(function(accept, reject) {
          fs.readFile(file, "utf8", function(err, body) {
            if (err) return reject(err);

            var output;

            try {
              output = Parser.parse(body);
            } catch (e) {
              e.message = "Error parsing " + file + ": " + e.message;
              return reject(e);
            }

            accept(output.contracts);
          });
        }).then(function(contract_names) {
          var returnVal = {};

          contract_names.forEach(function(contract_name) {
            returnVal[contract_name] = file;
          });

          return returnVal;
        });
      });

      Promise.all(promises).then(function(objects) {
        var contract_source_paths = {};

        objects.forEach(function(object) {
          Object.keys(object).forEach(function(contract_name) {
            contract_source_paths[contract_name] = object[contract_name];
          });
        });

        callback(null, contract_source_paths);
      }).catch(callback);
    });
  }
};
