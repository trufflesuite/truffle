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
var Graph = require("graphlib").Graph;
var isAcyclic = require("graphlib/lib/alg").isAcyclic;
var preOrder = require("graphlib/lib/alg").preorder;
var postOrder = require("graphlib/lib/alg").postorder;

var BlueBirdPromise = require('bluebird');

var Contracts = {
  resolve_headers(root) {
    root = path.resolve(root);
    var contract_name = path.basename(root).replace(/\.[^\.]*$/, "");

    var reduce_signature = function(signature) {
      return signature.reduce(function(previous, current, index) {
        var sig = "";
        if (index > 0) {
          sig += ", ";
        }
        sig += current.type;
        if (current.name != null && current.name != "") {
          sig += ` ${current.name}`;
        }
        return previous + sig;
      }, "");
    };

    var make_function = function(name, fn) {
      var returns = "";

      if (fn.outputs != null && fn.outputs.length > 0) {
        returns = ` returns (${reduce_signature(fn.outputs)})`;
      }

      return `  function ${name}(${reduce_signature(fn.inputs)})${returns}; \n`;
    };

    var code = this.resolve(root);

    var result = solc.compile(code, 1);

    if (result.errors != null) {
      throw new CompileError(result.errors.join(), root);
    }

    var compiled_contract = result.contracts[contract_name];
    var abi = JSON.parse(compiled_contract.interface);

    var headers = `contract ${contract_name} { \n`;

    for (var fn of abi) {
      switch(fn.type) {
        case "constructor":
          headers += make_function(contract_name, fn)
          break;
        case "function":
          headers += make_function(fn.name, fn);
          break;
        case "event":
          break;
        default:
          throw new Error(`Unknown type ${fn.type} found in ${root}`);
      }
    }

    headers += `} \n`;

    return headers;
  },

  resolve(root) {
    var imported = {};

    var import_file = (file) => {
      var code = fs.readFileSync(file, "utf-8");

      // Remove comments
      code = code.replace(/(\/\/.*(\n|$))/g, "");
      code = code.replace(/(\/\*(.|\n)*?\*\/)/g, "");
      code = code.replace("*/", ""); // Edge case.

      // Perform imports.
      code = code.replace(/import(_headers)? ('|")[^'"]+('|");/g, (match) => {
        match = match.replace(/'/g, '"');
        var import_name = match.split('"')[1];
        var import_path = path.dirname(file) + "/" + import_name + ".sol";

        // Don't import the same thing twice if there are two of the same dependency.
        if (imported[import_name] == true) {
          return "";
        }

        if (!fs.existsSync(import_path)) {
          throw `Could not find source for '${import_name} from ${file}'. Expected: ${import_path}`
        }

        imported[import_name] = true;

        if (match.indexOf("import_headers") == 0) {
          return this.resolve_headers(import_path) + "\n\n";
        } else {
          return import_file(import_path) + "\n\n";
        }
      });
      return code;
    };

    return import_file(root);
  },

  compile_all(config, callback) {
    var sources = {};
    var contracts = Object.keys(config.contracts.classes);
    for (var i = 0; i < contracts.length; i++) {
      var key = contracts[i];
      var contract = config.contracts.classes[key];
      var source = contract.source.replace("./contracts/", "");
      var full_path = path.resolve(config.working_dir, contract.source)
      sources[source] = fs.readFileSync(full_path, {encoding: "utf8"});
    }

    var result = solc.compile({sources: sources}, 1);

    if (result.errors != null) {
      callback(new CompileError(result.errors.join()));
      return;
    }

    var compiled_contract = result.contracts[key];

    for (var i = 0; i < contracts.length; i++) {
      var key = contracts[i];
      var contract = config.contracts.classes[key];
      var compiled_contract = result.contracts[key];
      contract["binary"] = compiled_contract.bytecode;
      contract["abi"] = JSON.parse(compiled_contract.interface);
    }

    callback();

    //   finished(null, contract);
    // }, callback);
  },

  write_contracts(config, description="contracts", callback) {
    var destination = config.contracts.build_directory;
    mkdirp(destination, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      var display_directory = "./" + path.join("./", destination.replace(config.working_dir, ""));
      if (config.argv.quietDeploy == null) {
        console.log(`Writing ${description} to ${display_directory}`);
      }

      PuddingGenerator.save(config.contracts.classes, destination, {removeExisting: true});

      callback();
    });
  },

  compile(config, callback) {
    async.series([
      (c) => {
        config.test_connection(function(error, coinbase) {
          if (error != null) {
            callback(new Error("Could not connect to your Ethereum client. Truffle uses your Ethereum client to compile contracts. Please ensure your client is running and can compile the all contracts within the contracts directory."));
          } else {
            c();
          }
        });
      },
      (c) => {
        this.compile_all(config, c);
      },
      (c) => {
        this.write_contracts(config, "contracts", c);
      }
    ], callback);
  },
  createContractAndWait(config, tx,contract_name) {
  
    return new Promise((accept, reject) => {
      
      config.web3.eth.sendTransaction(tx, (err, hash) => {
        if (err != null) {
          return reject(err);
        }

        var interval = setInterval(() => {
         
          config.web3.eth.getTransactionReceipt(hash, (err, receipt) => {
            if (err != null) {
              clearInterval(interval);
              
              return reject(err);
            }
            if (receipt != null) {
               console.log("Deployed: "+contract_name+" to address: "+receipt.contractAddress);
           
              accept({name:contract_name,address:receipt.contractAddress});
              clearInterval(interval);
            }
          });

        }, 1000);
      })
    });
  },
  build_dependency_graph(config,errorCallback)
  {     
        console.log("Collecting dependencies...");
        //Iterate through all the contracts looking for libraries and building a dependency graph 
        var dependsGraph = new Graph();
        for (var i = 0; i < config.app.resolved.deploy.length; i++) {
          var key = config.app.resolved.deploy[i];
          var contract_class = config.contracts.classes[key];

          if (contract_class == null) {
            errorCallback(new DeployError(`Error  could not find contract '${key}' for linking. Check truffle.json.`));
            return null;
          }
          //Add the contract to the depend graph  
          dependsGraph.setNode(key);

          //Find references to any librarys 
          //Library references are embedded in the bytecode of contracts with the format
          // "__Lib___________________________________" , where "Lib" is your library name and the whole
          // string is 40 characters long. This is the placeholder for the Lib's address.

          var regex = /__([^_]*)_*/g;
          var matches;
          while ( (matches = regex.exec(contract_class.binary)) !== null ) {
                var lib = matches[1];
                if(!dependsGraph.hasEdge(key,lib))
                   dependsGraph.setEdge(key, lib);
          }
        }
        //Check for cycles in the graph, the dependency graph needs to be a tree otherwise there's an error
        if(!isAcyclic(dependsGraph))
        {
           console.log("ERROR: Cycles in dependency graph");
           dependsGraph.edges().forEach(function(o){
              console.log(o.v+" -- depends on --> "+o.w);
           });
           errorCallback(new DeployError(`Error  linker found cyclic dependencies. Adjust your import statements to remove cycles.`));
           return null;
        }
        return dependsGraph;
       
  },
  link_dependencies(config,contract_data,contract_class,contract_name)
  {
    return (dependency_addresses) => {
          //All of the library dependencies to this contract have been deployed
          //Inject the address of each lib into this contract and then deploy it.
          dependency_addresses.forEach(function(lib){
            console.log("Linking Library: "+lib.name+" to contract: "+contract_name+" at address: "+lib.address);
            var bin_address = lib.address.replace("0x","");
            var re = new RegExp("__"+lib.name+"_*","g");
            contract_data.data = contract_data.data.replace(re,bin_address);
          });
          var contract = Pudding.whisk({
              abi: contract_class.abi,
              binary: contract_class.binary,
              contract_name: contract_name
            });
          return this.createContractAndWait(config,contract_data,contract_name);
    }
  },
  deploy(config, compile=true, done_deploying) {
    var coinbase = null;
    
    async.series([
      (c) => {
        config.web3.eth.getCoinbase(function(error, result) {
          coinbase = result;
          c(error, result);
        });
      },
      (c) => {
        if (compile == true) {
          this.compile_all(config, c);
        } else {
          c();
        }
      },
      (c) =>{
          Pudding.setWeb3(config.web3);
          var dependsGraph = this.build_dependency_graph(config,c);
          var dependsOrdering = postOrder(dependsGraph,dependsGraph.nodes());
          var deploy_promise = null;
          var contract_name ; //This is in global scope so that it can be used in the .catch below


          //Iterate over the dependency grpah in post order, deploy libraries first so we can
          //capture their addresses and use them to deploy the contracts that depend on them
          for(var i =0 ; i< dependsOrdering.length ;i++)
          {
              contract_name = dependsOrdering[i];
              var contract_class = config.contracts.classes[contract_name];
              
              if (contract_class == null) {
                c(new DeployError(`Could not find contract '${key}' for deployment. Check truffle.json.`));
                return;
              }
             
              var contract_data = { from: coinbase,
                                    gas: 3141592,
                                    //gasPrice: 50000000000, // 50 Shannon
                                    gasPrice: 100000000000, // 100 Shannon
                                    data: contract_class.binary
                                  };
              var dependencies = dependsGraph.successors(contract_name);

              //When we encounter a Library that is not dependant on other libraries, we can just
              //deploy it as normal
              if(dependencies.length == 0 )
              {
                 var contract = Pudding.whisk({
                  abi: contract_class.abi,
                  binary: contract_class.binary,
                  contract_name: contract_name
                });
                deploy_promise = this.createContractAndWait(config,contract_data,contract_name);

                //Store the promise in the graph so we can fetch it later
                dependsGraph.setNode(contract_name,deploy_promise);
              }
              //Contracts that have dependencies need to wait until those dependencies have been deployed
              //so we can inject the address into their byte code 
              else
              {
                //Collect all the promises for the libraries this contract depends on into a list
                //NOTE: since this loop is traversing in post-order, we can be assured that this list
                //will contain ALL of the dependencies of this contract
                var depends_promises = dependencies.map(dependsGraph.node,dependsGraph);

                //Wait for all the dependencies to be committed and then do the linking step
                deploy_promise = Promise.all(depends_promises)
                                        .then(this.link_dependencies(config,contract_data,contract_class,contract_name));
                
                //It's possible that this contract is a dependency of some other contract so we store
                //it in the graph just in case
                dependsGraph.setNode(contract_name,deploy_promise);
               
              }
          }
          ///Now wait for all of the outstanding deployments to complete
          Promise.all(dependsGraph.nodes().map(dependsGraph.node,dependsGraph))
          .then(function(deployed_contracts) {

            deployed_contracts.forEach(function(a){config.contracts.classes[a.name].address = a.address;});
            
            c();
          }).catch(function(err) {
            c(new DeployError(err.message, contract_name));
          });

      },
    (c) => {
        this.write_contracts(config, "built contract files", c);
    },
    (c) => {
        this.after_deploy(config, c);
      }
    ], (err) => {
      if (err != null) {
        done_deploying(err);
        return;
      } else {
        done_deploying();
      }
    });
  },

  after_deploy(config, done) {
    async.eachSeries(config.app.resolved.after_deploy, function(file, iterator_callback) {
      if (config.argv.quietDeploy == null) {
        console.log(`Running post deploy script ${file}...`);
      }
      Exec.file(config, file, iterator_callback);
    }, done);
  }
}

module.exports = Contracts;
