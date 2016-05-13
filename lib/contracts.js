var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var solc = require("solc");
var path = require("path");
var Compiler = require("./compiler");
var Exec = require("./exec");
var Pudding = require("ether-pudding");
var DeployError = require("./errors/deployerror");
var graphlib = require("graphlib");
var Graph = require("graphlib").Graph;
var isAcyclic = require("graphlib/lib/alg").isAcyclic;
var postOrder = require("graphlib/lib/alg").postorder;
var requireNoCache = require("./require-nocache");

var Contracts = {
  account: null,

  get_account: function(config, callback) {
    var self = this;

    if (config.app.resolved.rpc.from != null) {
      this.account = config.app.resolved.rpc.from;
    }

    if (this.account != null) {
      return callback(null, this.account);
    }

    config.web3.eth.getAccounts(function(err, result) {
      if (err != null) return callback(err);

      self.account = result[0];
      callback(null, self.account);
    });
  },

  // source_directory: String. Directory where .sol files can be found.
  // build_directory: String. Directory where .sol.js files can be found and written to.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // network_id: network id to link saved contract artifacts.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile: function(options, callback) {
    var self = this;

    function finished(err, contracts) {
      if (err) return callback(err);
      self.write_contracts(contracts, options, callback);
    };

    if (options.all == false) {
      Compiler.compile_necessary(options, finished);
    } else {
      Compiler.compile_all(options, finished);
    }
  },

  createContractAndWait: function(config, contract_name) {
    var self = this;

    var tx = {
      from: this.account,
      gas: config.app.resolved.rpc.gas || config.app.resolved.rpc.gasLimit,
      gasPrice: config.app.resolved.rpc.gasPrice, // 100 Shannon
      data: config.contracts.classes[contract_name].binary
    };

    return new Promise(function(accept, reject) {
      config.web3.eth.sendTransaction(tx, function(err, hash) {
        if (err != null) {
          return reject(err);
        }

        var interval = setInterval(function() {
          config.web3.eth.getTransactionReceipt(hash, function(err, receipt) {
            if (err != null) {
              clearInterval(interval);

              return reject(err);
            }
            if (receipt != null) {
              if (config.argv.quietDeploy == null) {
                console.log("Deployed: " + contract_name + " to address: " + receipt.contractAddress);
              }

              accept({
                name: contract_name,
                address: receipt.contractAddress
              });
              clearInterval(interval);
            }
          });
        }, 500);
      })
    });
  },

  build_deploy_dependency_graph: function(config, errorCallback) {
    if (config.argv.quietDeploy == null) {
      console.log("Collecting dependencies...");
    }
    // Iterate through all the contracts looking for libraries and building a dependency graph
    var dependsGraph = new Graph();
    for (var i = 0; i < config.app.resolved.deploy.length; i++) {
      var key = config.app.resolved.deploy[i];
      var contract_class = config.contracts.classes[key];

      if (contract_class == null) {
        errorCallback(new DeployError("Could not find contract '" + key + "' for linking. Check truffle.json."));
        return null;
      }

      if (contract_class.binary == null){
        errorCallback(new DeployError("Could not find compiled binary for contract '" + key + "'. Check truffle.json."));
        return null;
      }
      // Add the contract to the depend graph
      dependsGraph.setNode(key);

      // Find references to any librarys
      // Library references are embedded in the bytecode of contracts with the format
      //  "__Lib___________________________________" , where "Lib" is your library name and the whole
      //  string is 40 characters long. This is the placeholder for the Lib's address.

      var regex = /__([^_]*)_*/g;
      var matches;
      while ( (matches = regex.exec(contract_class.unlinked_binary)) !== null ) {
        var lib = matches[1];
        if (!dependsGraph.hasEdge(key,lib)) {
          dependsGraph.setEdge(key, lib);
        }
      }
    }
    // Check for cycles in the graph, the dependency graph needs to be a tree otherwise there's an error
    if (!isAcyclic(dependsGraph))
    {
      console.log("ERROR: Cycles in dependency graph");
      dependsGraph.edges().forEach(function(o){
        console.log(o.v+" -- depends on --> "+o.w);
      });
      errorCallback(new DeployError("Error  linker found cyclic dependencies. Adjust your import statements to remove cycles."));
      return null;
    }
    return dependsGraph;
  },

  link_dependencies: function(config, contract_name) {
    var self = this;
    return function(dependency_addresses) {
      var contract = config.contracts.classes[contract_name];

      //All of the library dependencies to this contract have been deployed
      //Inject the address of each lib into this contract and then deploy it.
      dependency_addresses.forEach(function(lib) {
        if (config.argv.quietDeploy == null) {
          console.log("Linking Library: " + lib.name + " to contract: " + contract_name + " at address: " + lib.address);
        }

        var bin_address = lib.address.replace("0x", "");
        var re = new RegExp("__" + lib.name + "_*", "g");
        contract.binary = contract.unlinked_binary.replace(re, bin_address);
      });

      return self.createContractAndWait(config, contract_name);
    }
  },

  deploy: function(config, compile, done_deploying) {
    var self = this;

    if (typeof compile == "function") {
      done_deploying = compile;
      compile = true;
    }

    if (compile == null) {
      compile == true;
    }

    async.series([
      function(c) {
        self.get_account(config, c);
      },
      function(c) {
        if (compile == true) {
          self.compile_necessary(config, c);
        } else {
          c();
        }
      },
      function(c) {
        Pudding.setWeb3(config.web3);
        var dependsGraph = self.build_deploy_dependency_graph(config, c);

        if( dependsGraph == null) {
          return;
        }

        var dependsOrdering = postOrder(dependsGraph, dependsGraph.nodes());
        var deploy_promise = null;
        var contract_name; // This is in global scope so that it can be used in the .catch below

        // Iterate over the dependency grpah in post order, deploy libraries first so we can
        // capture their addresses and use them to deploy the contracts that depend on them
        for(var i = 0; i < dependsOrdering.length; i++) {
          contract_name = dependsOrdering[i];
          var contract_class = config.contracts.classes[contract_name];

          if (contract_class == null) {
            c(new DeployError("Could not find contract '" + contract_name + "' for deployment. Check truffle.json."));
            return;
          }

          var dependencies = dependsGraph.successors(contract_name);

          // When we encounter a Library that is not dependant on other libraries, we can just
          // deploy it as normal
          if (dependencies.length == 0) {
            deploy_promise = self.createContractAndWait(config, contract_name);

            // Store the promise in the graph so we can fetch it later
            dependsGraph.setNode(contract_name, deploy_promise);
          }
          // Contracts that have dependencies need to wait until those dependencies have been deployed
          // so we can inject the address into their byte code
          else
          {
            // Collect all the promises for the libraries this contract depends on into a list
            // NOTE: since this loop is traversing in post-order, we can be assured that this list
            // will contain ALL of the dependencies of this contract
            var depends_promises = dependencies.map(dependsGraph.node, dependsGraph);

            // Wait for all the dependencies to be committed and then do the linking step
            deploy_promise = Promise.all(depends_promises).then(
              self.link_dependencies(config, contract_name)
            );

            // It's possible that this contract is a dependency of some other contract so we store
            // it in the graph just in case
            dependsGraph.setNode(contract_name,deploy_promise);
          }
        }
        ///Now wait for all of the outstanding deployments to complete
        Promise.all(dependsGraph.nodes().map(dependsGraph.node, dependsGraph))
        .then(function(deployed_contracts) {
          deployed_contracts.forEach(function(a) {
            config.contracts.classes[a.name].address = a.address;
          });
          c();
        }).catch(function(err) {
          c(new DeployError(err.message, contract_name));
        });
      },
      function(c) {
        self.write_contracts(config, "built contract files", c);
      },
      function(c) {
        self.after_deploy(config, c);
      }
    ], function(err) {
      if (err != null) {
        done_deploying(err);
        return;
      } else {
        done_deploying();
      }
    });
  },

  after_deploy: function(config, done) {
    async.eachSeries(config.app.resolved.after_deploy, function(file, iterator_callback) {
      if (config.argv.quietDeploy == null) {
        console.log("Running post deploy script " + file + "...");
      }
      Exec.file(config, file, iterator_callback);
    }, done);
  },

  write_contracts: function(contracts, options, callback) {
    mkdirp(options.build_directory, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      if (options.quiet != true) {
        console.log("Writing artifacts to ." + path.sep + path.relative(process.cwd(), options.build_directory));
      }

      Pudding.saveAll(contracts, options.build_directory, options).then(callback).catch(callback);
    });
  }
}

module.exports = Contracts;
