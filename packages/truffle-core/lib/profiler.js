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
var Config = require("./config");
var Sources = require("./sources");
var expect = require("./expect");

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
        self.all_contracts(contracts_directory, done);
      }
    }

    getFiles(function(err, files) {
      var expected_build_files = files.map(function(file) {
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

        var network_id = network.network_id || "*";
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

  required_sources: function(options, callback) {
    var config = Config.default().merge(options);

    expect.options(config, [
      "paths",
      "base_path",
      "sources"
    ]);

    var paths = this.convert_to_absolute_paths(config.paths, config.base_path);

    this.dependency_graph(paths, config.sources, function(err, dependsGraph) {
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

      Sources.find(import_path, sources, imported_from, function(err, body, source) {
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
  },

  ordered_abi: function(file, contract, callback) {
    fs.readFile(file, {encoding: "utf8"}, function(err, body) {
      if (err) return callback(err);

      var ordered_function_names = [];
      var ordered_functions = [];

      var abi = contract.abi;
      var ast = SolidityParser.parse(body);
      var contract_definition;

      for (var i = 0; i < ast.body.length; i++) {
        var definition = ast.body[i];

        if (definition.type != "ContractStatement") continue;

        if (definition.name == contract.contract_name) {
          contract_definition = definition;
          break;
        }
      }

      if (!contract_definition) return callback(null, contract.abi);

      contract_definition.body.forEach(function(statement) {
        if (statement.type == "FunctionDeclaration") {
          ordered_function_names.push(statement.name);
        }
      });

      // Put function names in a hash with their order, lowest first, for speed.
      var functions_to_remove = ordered_function_names.reduce(function(obj, value, index) {
        obj[value] = index;
        return obj;
      }, {});

      // Filter out functions from the abi
      var function_definitions = abi.filter(function(item) {
        return functions_to_remove[item.name] != null;
      });

      // Sort removed function defintions
      function_definitions = function_definitions.sort(function(item_a, item_b) {
        var a = functions_to_remove[item_a.name];
        var b = functions_to_remove[item_b.name];

        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
      });

      // Create a new ABI, placing ordered functions at the end.
      var newABI = [];
      abi.forEach(function(item) {
        if (functions_to_remove[item.name] != null) return;
        newABI.push(item);
      });

      // Now pop the ordered functions definitions on to the end of the abi..
      Array.prototype.push.apply(newABI, function_definitions);

      callback(null, newABI);
    })

  }
};
