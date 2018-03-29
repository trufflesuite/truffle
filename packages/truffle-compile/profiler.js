// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.

var path = require("path");
var async = require("async");
var fs = require("fs");
var Graph = require("graphlib").Graph;
var isAcyclic = require("graphlib/lib/alg").isAcyclic;
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

  required_sources: function(options, callback) {
    var self = this;

    expect.options(options, [
      "paths",
      "base_path",
      "resolver"
    ]);

    var paths = this.convert_to_absolute_paths(options.paths, options.base_path);

    function findRequiredSources(dependsGraph, done) {
      var required = {};

      function hasBeenTraversed(import_path) {
        return required[import_path] != null;
      }

      function include(import_path) {
        //console.log("Including: " + file)

        required[import_path] = dependsGraph.node(import_path);
      }

      function walk_down(import_path) {
        if (hasBeenTraversed(import_path)) {
          return;
        }

        include(import_path);

        var dependencies = dependsGraph.successors(import_path);

        // console.log("At: " + import_path);
        // console.log("   Dependencies: ", dependencies);

        if (dependencies.length > 0) {
          dependencies.forEach(walk_down);
        }
      }

      function walk_from(import_path) {
        if (hasBeenTraversed(import_path)) {
          return;
        }

        var ancestors = dependsGraph.predecessors(import_path);
        var dependencies = dependsGraph.successors(import_path);

        // console.log("At: " + import_path);
        // console.log("   Ancestors: ", ancestors);
        // console.log("   Dependencies: ", dependencies);

        include(import_path);

        if (ancestors && ancestors.length > 0) {
          ancestors.forEach(walk_from);
        }

        if (dependencies && dependencies.length > 0) {
          dependencies.forEach(walk_down);
        }
      }

      paths.forEach(walk_from);

      done(null, required);
    }

    find_contracts(options.base_path, function(err, allPaths) {
      if (err) return callback(err);

      // Include paths for Solidity .sols, specified in options.
      allPaths = allPaths.concat(paths);

      self.dependency_graph(allPaths, options.resolver, function(err, dependsGraph) {
        if (err) return callback(err);

        findRequiredSources(dependsGraph, callback);
      });
    });
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

  dependency_graph: function(paths, resolver, callback) {
    var self = this;

    // Iterate through all the contracts looking for libraries and building a dependency graph
    var dependsGraph = new Graph();

    var imports_cache = {};

    // For the purposes of determining correct error messages.
    // The second array item denotes which path imported the current path.
    // In the case of the paths passed in, there was none.
    paths = paths.map(function(p) {
      return [p, null];
    });

    async.whilst(function() {
      return paths.length > 0;
    }, function(finished) {
      var current = paths.shift();
      var import_path = current[0];
      var imported_from = current[1];

      if (dependsGraph.hasNode(import_path) && imports_cache[import_path] != null) {
        return finished();
      }

      resolver.resolve(import_path, imported_from, function(err, resolved_body, resolved_path, source) {
        if (err) return finished(err);

        if (dependsGraph.hasNode(resolved_path) && imports_cache[resolved_path] != null) {
          return finished();
        }

        // Add the contract to the depends graph.
        dependsGraph.setNode(resolved_path, resolved_body);

        var imports;

        try {
          imports = Parser.parseImports(resolved_body);
        } catch (e) {
          e.message = "Error parsing " + import_path + ": " + e.message;
          return finished(e);
        }

        // Convert explicitly relative dependencies of modules
        // back into module paths. We also use this loop to update
        // the graph edges.
        imports = imports.map(function(dependency_path) {
          // Convert explicitly relative paths
          if (self.isExplicitlyRelative(dependency_path)) {
            dependency_path = source.resolve_dependency_path(import_path, dependency_path);
          }

          // Update graph edges
          if (!dependsGraph.hasEdge(import_path, dependency_path)) {
            dependsGraph.setEdge(import_path, dependency_path);
          }

          // Return an array that denotes a new import and the path it was imported from.
          return [dependency_path, import_path];
        });

        imports_cache[import_path] = imports;

        Array.prototype.push.apply(paths, imports);

        finished();
      });
    },
    function(err) {
      if (err) return callback(err);
      callback(null, dependsGraph)
    });
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
