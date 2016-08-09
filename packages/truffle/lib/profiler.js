// Compares .sol files to their .sol.js counterparts,
// determines which .sol files have been updated.
var dir = require("node-dir");
var path = require("path");
var async = require("async");
var fs = require("fs");
var Pudding = require("ether-pudding");
var SolidityParser = require("solidity-parser");
var Graph = require("graphlib").Graph;
var isAcyclic = require("graphlib/lib/alg").isAcyclic;
var postOrder = require("graphlib/lib/alg").postorder;
var CompileError = require("./errors/compileerror");

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
    var contracts_directory = options.contracts_directory;
    var build_directory = options.contracts_build_directory;

    this.all_contracts(contracts_directory, function(err, files) {
      var expected_build_files = files.map(function(file) {
        //return path.join(build_directory, path.dirname(path.relative(contracts_directory, file)), path.basename(file) + ".js");
        return path.join(build_directory, path.basename(file) + ".js");
      });

      async.map(files, fs.stat, function(err, file_stats) {
        if (err) return callback(err);

        async.map(expected_build_files, function(build_file, finished) {
          Pudding.requireFile(build_file, options, function(err, contract) {
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

            // Note that the network is already set for is in Pudding.requireFile().
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

  deployed_networks: function(options, callback) {
    Pudding.requireAll(options.contracts_build_directory, function(err, contracts) {
      if (err) return callback(err);

      var ids_to_names = {};
      var networks = {};

      Object.keys(options.networks).forEach(function(network_name) {
        var network = options.networks[network_name];

        // Ignore the test network that's configured by default.
        if (network_name == "test" && network.network_id == null) {
          return;
        }

        var network_id = network.network_id || "default";
        ids_to_names[network_id] = network_name;
        networks[network_name] = {};
      });

      contracts.forEach(function(contract) {
        Object.keys(contract.all_networks).forEach(function(network_id) {
          var network_name = ids_to_names[network_id] || network_id;

          if (networks[network_name] == null) {
            networks[network_name] = {};
          }

          var address = contract.all_networks[network_id].address;

          if (address == null) return;

          networks[network_name][contract.contract_name] = address;
        });
      });

      callback(null, networks);
    });
  },

  imports: function(file, from, callback) {
    if (typeof from == "function") {
      callback = from;
      from = null;
    }

    fs.readFile(file, "utf8", function(err, body) {
      if (err) {
        var msg = "Cannot find import " + path.basename(file);
        if (from) {
          msg += " from " + path.basename(from);
        }
        msg += ". If it's a relative path, ensure it starts with `./` or `../`."
        return callback(new CompileError(msg));
      }

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
        //console.log("Including: " + file)

        required[file] = true;
      }

      function walk_down(file) {
        if (required[file] === true) {
          return;
        }

        include(file);

        var dependencies = dependsGraph.successors(file);

        // console.log("At: " + file);
        // console.log("   Dependencies: ", dependencies);

        if (dependencies.length > 0) {
          dependencies.forEach(walk_down);
        }
      }

      function walk_from(file) {
        var ancestors = dependsGraph.predecessors(file);
        var dependencies = dependsGraph.successors(file);

        // console.log("At: " + file);
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

    // Ensure full paths. Return array of file and
    // the file responsible for adding it. Initial files
    // have no second paramter.
    files = files.map(function(file) {
      return [path.resolve(file), null];
    });

    // Iterate through all the contracts looking for libraries and building a dependency graph
    var dependsGraph = new Graph();

    var imports_cache = {};

    function getImports(file, from, callback) {
      if (imports_cache[file] != null) {
        callback(null, imports_cache[file]);
      } else {
        self.imports(file, from, function(err, imports) {
          if (err) return callback(err);
          imports_cache[file] = imports;
          callback(null, imports);
        });
      }
    };

    async.whilst(function() {
      return files.length > 0;
    }, function(finished) {
      var current = files.shift();
      var file = current[0];
      var imported_from = current[1];

      if (dependsGraph.hasNode(file) && imports_cache[file] != null) {
        return finished();
      }

      // Add the contract to the depend graph.
      dependsGraph.setNode(file);

      getImports(file, imported_from, function(err, imports) {
        if (err) return callback(err);

        imports = imports.map(function(i) {
          return [i, file];
        });

        Array.prototype.push.apply(files, imports);

        imports.forEach(function(arr) {
          var import_path = arr[0];
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
