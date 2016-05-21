var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var solc = require("solc");
var path = require("path");
var Exec = require("./exec");
var Pudding = require("ether-pudding");
var PuddingGenerator = require("ether-pudding/generator");
var ConfigurationError = require("./errors/configurationerror");
var CompileError = require("./errors/compileerror");
var DeployError = require("./errors/deployerror");
var graphlib = require("graphlib");
var Graph = require("graphlib").Graph;
var isAcyclic = require("graphlib/lib/alg").isAcyclic;
var postOrder = require("graphlib/lib/alg").postorder;


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

  update_sources: function(config, callback) {
    var contract_names = Object.keys(config.contracts.classes);
    async.each(contract_names, function(name, done) {
      var contract = config.contracts.classes[name];
      fs.readFile(contract.file, {encoding: "utf8"}, function(err, body) {
        if (err) return done(err);
        contract.body = body;
        done();
      });
    }, callback);
  },

  compile_necessary: function(config, callback) {
    var self = this;
    this.update_sources(config, function() {
      var contract_names = Object.keys(config.contracts.classes);

      var sources = {};
      var updated = {};
      var included = {};

      for (var i = 0; i < contract_names.length; i++) {
        var name = contract_names[i];
        var contract = config.contracts.classes[name];

        if (contract.source_modified_time > contract.compiled_time || config.argv.compileAll === true) {
          updated[name] = true;
        }
      }

      if (Object.keys(updated).length == 0 && config.argv.quietDeploy == null) {
        console.log("No contracts updated; skipping compilation.");
        return callback();
      }

      var dependsGraph = self.build_compile_dependency_graph(config, callback);
      self.compilationDependenciesGraph = dependsGraph;
      if (dependsGraph == null) {
        return;
      }

      function is_updated(contract_name) {
        return updated[contract_name] === true;
      }

      function include_source_for(contract_name) {
        var contract = config.contracts.classes[contract_name];
        var source_path = path.relative(config.contracts.directory, contract.source);

        if (sources[source_path] != null) {
          return;
        }

        var full_path = path.resolve(config.working_dir, contract.source)
        sources[source_path] = fs.readFileSync(full_path, {encoding: "utf8"});

        // For graph traversing
        included[contract_name] = true;
      }

      function walk_down(contract_name) {
        if (included[contract_name] === true) {
          return;
        }

        include_source_for(contract_name);

        var dependencies = dependsGraph.successors(contract_name);

        // console.log("At: " + contract_name);
        // console.log("   Dependencies: ", dependencies);

        if (dependencies.length > 0) {
          dependencies.forEach(walk_down);
        }
      }

      function walk_from(contract_name) {
        // if (included[contract_name] === true) {
        //   return;
        // }

        var ancestors = dependsGraph.predecessors(contract_name);
        var dependencies = dependsGraph.successors(contract_name);

        // console.log("At: " + contract_name);
        // console.log("   Ancestors: ", ancestors);
        // console.log("   Dependencies: ", dependencies);

        include_source_for(contract_name);

        if (ancestors.length > 0) {
          ancestors.forEach(walk_from);
        }

        if (dependencies.length > 0) {
          dependencies.forEach(walk_down);
        }
      }

      Object.keys(updated).forEach(walk_from);

      Object.keys(sources).sort().forEach(function(file_path) {
        if (config.argv.quietDeploy == null) {
          console.log("Compiling " + file_path + "...");
        }
      });

      var result = solc.compile({sources: sources}, 1);
      var errors = result.errors || [];
      var warnings = result.errors || [];

      if (!config.argv.strict) {
        errors = errors.filter(function(error) {
          return error.indexOf("Warning:") < 0;
        });
        warnings = warnings.filter(function(error) {
          return error.indexOf("Warning:") >= 0;
        });

        if (config.argv.quietDeploy == null) {
          warnings.forEach(function(warning) {
            console.log(warning);
          });
        }
      }

      if (errors.length > 0) {
        return callback(new CompileError(result.errors.join()));
      }

      // Examine the sources, and ensure the contract we expected was defined
      var filenames = Object.keys(sources);
      for (var i = 0; i < filenames.length; i++) {
        var filename = filenames[i];
        var expected_contract = path.basename(filename, ".sol");

        if (result.contracts[expected_contract] == null) {
          return callback(new CompileError("Could not find expected contract or library in '" + filename + "': contract or library '" + expected_contract + "' not found."));
        }
      }

      for (var i = 0; i < contract_names.length; i++) {
        var name = contract_names[i];
        var contract = config.contracts.classes[name];
        var compiled_contract = result.contracts[name];

        // If we didn't compile this contract this run, continue.
        if (compiled_contract == null) {
          continue;
        }

        contract.binary = compiled_contract.bytecode;
        contract.unlinked_binary = compiled_contract.bytecode;
        contract.abi = JSON.parse(compiled_contract.interface);
      }

      callback();
    });
  },

  compile: function(config, callback) {
    var self = this;
    async.series([
      function(c) {
        self.compile_necessary(config, c);
      },
      function(c) {
        self.write_contracts(config, "contracts", c);
      }
    ], callback);
  },


  //############## Deploy libraries from a list

  /**
   * Deploy all libraries from config.app.resolved.libraries (truffle.js)
   * @param  {object}     config      the configuration parameters object
   * @param  {function}   callback    callback to be called when the process is over
   */
  deployLibraries: function(config, callback, postpone) {

    var self = this;
    self.libraries = [];
    if(config.app.resolved.libraries.length === 0) return callback();

    Pudding.setWeb3(config.web3);
    var promises = [];

    //fetch all libraries from config
    for (var i = 0; i < config.app.resolved.libraries.length; i++) {
      //iterate over them and deploy them
      var contract_name = config.app.resolved.libraries[i];
      var contract_class = config.contracts.classes[contract_name];
      if (config.argv.quietDeploy == null) {
        console.log('Deploying library : ', contract_name);
      }

      promises[promises.length++] = self.createContractAndWait(config, contract_name);
    }

    //use Promise.all to wait for all libraries to be deployed
    Promise.all(promises)
    .then(function(librariesDeployed){

      for(var i = 0; i < librariesDeployed.length; i++) {
        var library = librariesDeployed[i];
        self.libraries[library.name] = { name: library.name, address: library.address, dependencies: [] };
        self.linkLibrary(config, library, library.name);
      }

      if(callback) callback();
    })
    .catch(function(error){
      callback(error);
    });
  },
  /**
   * Used to iterate recursively through the graph finding library dependent contracts and link them
   * @param  {object}     library         the deployed library to be linked, e.g: "{ name: 'ConvertLib', address: '0x0000000000000'}".
   * @param  {string}     contractName    this parameter carries the name of the contract/library to be used to look for dependencies.
   */
  linkLibrary: function(config, library, contractName) {
    var self = this;
    if(!library) return;

    var preDeployedLib = self.libraries[library.name];
    if(preDeployedLib && preDeployedLib.dependencies.indexOf(contractName) === -1) {
      if(contractName !== library.name) {
        self.libraries[library.name].dependencies.push(contractName);
      }
    }

    if(config.app.resolved.deploy.indexOf(contractName) !== -1) return;
    if(!self.compilationDependenciesGraph) return;

    var dependencies = self.compilationDependenciesGraph.predecessors(contractName);
    if(dependencies && dependencies.length > 0) {
      var idxDependency = dependencies.length-1;
      while(idxDependency >= 0)
      {
        var dependency = dependencies[idxDependency];
        self.linkLibrary(config, library, dependency);

        idxDependency--;
      }
    }

    if(contractName === library.name) return;
    var contract = config.contracts.classes[contractName];
    var libraryBinAddress = library.address.replace("0x", "");
    var regex = new RegExp("__" + library.name + "_*", "g");
    var usingLibrary = regex.test(contract.binary);
    if(usingLibrary) {
      config.contracts.classes[contractName].binary = contract.binary.replace(regex, libraryBinAddress);
    } else {
      var confirmLibraryUsage = regex.test(contract.unlinked_binary);
      if(confirmLibraryUsage) {
        config.contracts.classes[contractName].binary = contract.unlinked_binary.replace(regex, libraryBinAddress);
      }
    }
  },
  //############## Deploy libraries from a list

  createContractAndWait: function(config, contract_name) {
    var self = this;

    var tx = {
      from: this.account,
      gas: config.app.resolved.rpc.gas || config.app.resolved.rpc.gasLimit,
      gasPrice: config.app.resolved.rpc.gasPrice, // 100 Shannon
      data: config.contracts.classes[contract_name].binary
    };

    return new Promise(function(accept, reject) {

      if(self.libraries) {
        var preDeployedLib = self.libraries[contract_name];
        if(preDeployedLib)
        {
          return accept({
            name: preDeployedLib.name,
            address: preDeployedLib.address
          });
        }
      }


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

  build_compile_dependency_graph: function(config, errorCallback) {
    if (config.argv.quietDeploy == null) {
      console.log("Checking sources...");
    }
    // Iterate through all the contracts looking for libraries and building a dependency graph
    var dependsGraph = new Graph();
    var contract_names = Object.keys(config.contracts.classes);
    for (var i = 0; i < contract_names.length; i++) {
      var name = contract_names[i]
      var contract = config.contracts.classes[name];

      if (contract == null) {
        errorCallback(new CompileError("Could not find contract '" + name + "' for compiling. Check truffle.json."));
        return null;
      }

      // Add the contract to the depend graph
      dependsGraph.setNode(name);

      // Find import statements and resolve those import paths, adding them to the graph.
      contract.body.split(/;|\n/).filter(function(line) {
        return line.indexOf("import") >= 0;
      }).forEach(function(line) {
        var regex = /import.*("|')([^"']+)("|')*/g;
        var match = regex.exec(line);

        if (match == null) return;

        var file = match[2];
        var dependency_name = path.basename(file, ".sol");

        if (!dependsGraph.hasEdge(name, dependency_name)) {
          dependsGraph.setEdge(name, dependency_name);
        }
      });
    }
    // Check for cycles in the graph, the dependency graph needs to be a tree otherwise there's an error
    if (!isAcyclic(dependsGraph))
    {
      console.log("ERROR: Cycles in dependency graph");
      dependsGraph.edges().forEach(function(o){
        console.log(o.v+" -- depends on --> "+o.w);
      });
      errorCallback(new CompileError("Found cyclic dependencies. Adjust your import statements to remove cycles."));
      return null;
    }
    return dependsGraph;
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

        if(self.libraries) {
          var preDeployedLib = self.libraries[lib.name];
          if(preDeployedLib && preDeployedLib.dependencies.indexOf(contract_name) !== -1) {
            if (config.argv.quietDeploy == null) {
              console.log('Pre-deployed library: ', preDeployedLib.name);
            }
            lib = preDeployedLib;
          }
        }

        if (config.argv.quietDeploy == null) {
          console.log("Linking Library: " + lib.name + " to contract: " + contract_name + " at address: " + lib.address);
        }

        var libraryBinAddress = lib.address.replace("0x", "");
        var regex = new RegExp("__" + lib.name + "_*", "g");
        var usingLibrary = regex.test(contract.binary);
        if(usingLibrary) {
          contract.binary = contract.binary.replace(regex, libraryBinAddress);
        } else {
          var confirmLibraryUsage = regex.test(contract.unlinked_binary);
          if(confirmLibraryUsage) {
            contract.binary = contract.unlinked_binary.replace(regex, libraryBinAddress);
          }
        }
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
      //############## Deploy libraries from a list
      function(c) {
        self.deployLibraries(config, c);
      },
      //############## Deploy libraries from a list
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
            c(new DeployError("Could not find contract '" + contract_name + "' for deployment. Check truffle.js."));
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

  write_contracts: function(config, description, callback) {
    var destination = config.contracts.build_directory;

    description = description || "contracts";
    mkdirp(destination, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      var display_directory = "." + path.sep + path.relative(config.working_dir, destination); // path.join("./", destination.replace(config.working_dir, ""));
      if (config.argv.quietDeploy == null) {
        console.log("Writing " + description + " to " + display_directory);
      }

      PuddingGenerator.save(config.contracts.classes, destination, {removeExisting: true});
      callback();
    });
  }
}

module.exports = Contracts;
