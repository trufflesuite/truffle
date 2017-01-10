// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.

var path = require("path");
var async = require("async");
var fs = require("fs");
var artifactor = require("truffle-artifactor");
var SolidityParser = require("solidity-parser");
var Graph = require("graphlib").Graph;
var isAcyclic = require("graphlib/lib/alg").isAcyclic;
var CompileError = require("./compileerror");
var expect = require("truffle-expect");
var find_contracts = require("truffle-contract-sources");
var resolver = require("truffle-resolver");

module.exports = {
  updated: function(options, callback) {
    var self = this;

    expect.options(options, [
      "network_id"
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

    getFiles(function(err, files) {
      var expected_build_files = files.map(function(file) {
        return path.join(build_directory, path.basename(file) + ".js");
      });

      async.map(files, fs.stat, function(err, file_stats) {
        if (err) return callback(err);

        async.map(expected_build_files, function(build_file, finished) {
          artifactor.requireFile(build_file, options, function(err, contract) {
            // Ignore errors, i.e., if the file doesn't exist.
            finished(null, contract);
          });
        }, function(err, contracts) {
          if (err) return callback(err);

          var updated = [];

          for (var i = 0; i < contracts.length; i++) {
            var file_stat = file_stats[i];
            var contract = contracts[i];

            if (contract == null) {
              updated.push(files[i]);
              continue;
            }

            var modified_time = (file_stat.mtime || file_stat.ctime).getTime();

            // Note that the network is already set for is in artifactor.requireFile().
            var built_time = contract.updated_at || 0;

            if (modified_time > built_time) {
              updated.push(files[i]);
            }
          }

          callback(null, updated);
        });
      });
    });
  },

  required_sources: function(options, callback) {
    expect.options(options, [
      "paths",
      "base_path",
      "sources"
    ]);

    var paths = this.convert_to_absolute_paths(options.paths, options.base_path);

    this.dependency_graph(paths, options.sources, function(err, dependsGraph) {
      if (err) return callback(err);

      var required = {};

      function include(import_path) {
        //console.log("Including: " + file)

        required[import_path] = dependsGraph.node(import_path);
      }

      function walk_down(import_path) {
        if (required[import_path] === true) {
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
        var ancestors = dependsGraph.predecessors(import_path);
        var dependencies = dependsGraph.successors(import_path);

        // console.log("At: " + import_path);
        // console.log("   Ancestors: ", ancestors);
        // console.log("   Dependencies: ", dependencies);

        include(import_path);

        if (ancestors.length > 0) {
          ancestors.forEach(walk_from);
        }

        if (dependencies.length > 0) {
          dependencies.forEach(walk_down);
        }
      }

      paths.forEach(walk_from);

      callback(null, required);
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

  dependency_graph: function(paths, sources, callback) {
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

      resolver.resolve(import_path, sources, imported_from, function(err, body, source) {
        if (err) return callback(err);

        // Add the contract to the depends graph.
        dependsGraph.setNode(import_path, body);

        var imports = SolidityParser.parse(body, "imports");

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
    function() {
      // Check for cycles in the graph, the dependency graph needs to be a tree otherwise there's an error
      if (!isAcyclic(dependsGraph)) {
        var errorMessage = "Found cyclic dependencies. Adjust your import statements to remove cycles.\n\n";
        dependsGraph.edges().forEach(function(o){
          errorMessage += o.v + " -- depends on --> " + o.w + "\n";
        });
        return callback(new CompileError(errorMessage));
      }
      callback(null, dependsGraph)
    });
  }
};
