// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.
var dir = require("node-dir");
var path = require("path");
var async = require("async");
var fs = require("fs");
var SolidityParser = require("solidity-parser");
var Graph = require("graphlib").Graph;
var isAcyclic = require("graphlib/lib/alg").isAcyclic;
var postOrder = require("graphlib/lib/alg").postorder;

module.exports = {
  all_contracts: function(directory, callback) {
    dir.files(directory, function(err, files) {
      if (err) return callback(err);

      files = files.filter(function(file) {
        // Ignore any files that aren't solidity files.
        return path.extname(file) == ".sol" && path.basename(file)[0] != ".";
      });

      callback(null, files);
    });
  },

  updated: function(options, callback) {
    var source_directory = options.source_directory;
    var build_directory = options.build_directory;

    this.all_contracts(source_directory, function(err, files) {
      var expected_build_files = files.map(function(file) {
        return path.join(build_directory, path.dirname(path.relative(source_directory, file)), path.basename(file) + ".js");
      });

      async.map(files, fs.stat, function(err, file_stats) {
        if (err) return callback(err);

        async.map(expected_build_files, function(expected_file, finished) {
          fs.stat(expected_file, function(err, stat) {
            // Ignore errors when built files don't exist.
            finished(null, stat);
          });
        }, function(err, built_file_stats) {
          if (err) return callback(err);

          var updated = [];

          for (var i = 0; i < built_file_stats.length; i++) {
            var file_stat = file_stats[i];
            var built_file_stat = built_file_stats[i];

            if (built_file_stat == null) {
              updated.push(files[i]);
              continue;
            }

            var modified_time = (file_stat.mtime || file_stat.ctime).getTime();
            var built_time = (built_file_stat.mtime || built_file_stat.ctime).getTime();

            if (modified_time > built_time) {
              updated.push(files[i]);
            }
          }

          callback(null, updated);
        });
      });
    });
  },

  imports: function(file, callback) {
    fs.readFile(file, "utf8", function(err, body) {
      if (err) callback(err);

      //console.log("Parsing " + path.basename(file) + "...");

      var imports = SolidityParser.parse(body, "imports");

      var dirname = path.dirname(file);
      imports = imports.map(function(i) {
        return path.resolve(path.join(dirname, i));
      });

      callback(null, imports);
    });
  },

  required_files: function(files, callback) {
    // Ensure full paths.
    files = files.map(function(file) {
      return path.resolve(file);
    });

    this.dependency_graph(files, function(err, dependsGraph) {
      if (err) return callback(err);

      function is_updated(contract_name) {
        return updated[contract_name] === true;
      }

      var required = {};

      function include(file) {
        required[file] = true;
      }

      function walk_down(file) {
        if (required[file] === true) {
          return;
        }

        include(file);

        var dependencies = dependsGraph.successors(file);

        // console.log("At: " + contract_name);
        // console.log("   Dependencies: ", dependencies);

        if (dependencies.length > 0) {
          dependencies.forEach(walk_down);
        }
      }

      function walk_from(file) {
        var ancestors = dependsGraph.predecessors(file);
        var dependencies = dependsGraph.successors(file);

        // console.log("At: " + contract_name);
        // console.log("   Ancestors: ", ancestors);
        // console.log("   Dependencies: ", dependencies);

        include(file);

        if (ancestors.length > 0) {
          ancestors.forEach(walk_from);
        }

        if (dependencies.length > 0) {
          dependencies.forEach(walk_down);
        }
      }

      files.forEach(walk_from);

      callback(null, Object.keys(required));
    });
  },

  dependency_graph: function(files, callback) {
    var self = this;

    // Ensure full paths.
    files = files.map(function(file) {
      return path.resolve(file);
    });

    // Iterate through all the contracts looking for libraries and building a dependency graph
    var dependsGraph = new Graph();

    var imports_cache = {};

    function getImports(file, callback) {
      if (imports_cache[file] != null) {
        callback(null, imports_cache[file]);
      } else {
        self.imports(file, function(err, imports) {
          if (err) return callback(err);
          imports_cache[file] = imports;
          callback(null, imports);
        });
      }
    };

    async.each(files, function(file, finished) {
      // Add the contract to the depend graph.
      dependsGraph.setNode(file);

      getImports(file, function(err, imports) {
        if (err) return callback(err);

        imports.forEach(function(import_path) {
          if (!dependsGraph.hasEdge(file, import_path)) {
            dependsGraph.setEdge(file, import_path);
          }
        });

        finished();
      })
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
  },
};
