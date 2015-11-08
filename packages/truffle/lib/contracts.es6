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

    var result = solc.compile(code, 0);

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
    async.mapSeries(Object.keys(config.contracts.classes), (key, finished) => {
      var contract = config.contracts.classes[key];
      var source = contract.source;
      var full_path = path.resolve(config.working_dir, source);

      if (config.argv.quietDeploy == null) {
        console.log(`Compiling ${source}...`);
      }

      var code;

      try {
        code = this.resolve(full_path);
      } catch (e) {
        finished(e);
        return;
      }

      var result = solc.compile(code, 1);

      if (result.errors != null) {
        finished(new CompileError(result.errors.join(), source));
        return;
      }

      var compiled_contract = result.contracts[key];

      contract["binary"] = compiled_contract.bytecode;
      contract["abi"] = JSON.parse(compiled_contract.interface);

      finished(null, contract);
    }, callback);
  },

  write_contracts(config, description="contracts", callback) {
    mkdirp(config.environments.current.directory, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      var display_directory = "./" + path.join("./", config.environments.current.directory.replace(config.working_dir, ""));
      if (config.argv.quietDeploy == null) {
        console.log(`Writing ${description} to ${display_directory}`);
      }

      PuddingGenerator.save(config.contracts.classes, config.environments.current.directory, {removeExisting: true});

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

  createContractAndWait(config, tx) {
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
              accept(receipt.contractAddress);
              clearInterval(interval);
            }
          });
        }, 1000);
      })
    });
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
      (c) => {
        Pudding.setWeb3(config.web3);

        var txs = [];

        for (var i = 0; i < config.app.resolved.deploy.length; i++) {
          var key = config.app.resolved.deploy[i];
          var contract_class = config.contracts.classes[key];

          if (contract_class == null) {
            callback(new Error(`Could not find contract '${key}' for deployment. Check app.json.`));
            return;
          }

          var contract = Pudding.whisk(contract_class.abi, contract_class.binary);

          var display_name = path.basename(contract_class.source);
          if (config.argv.quietDeploy == null) {
            console.log(`Sending ${display_name} to the network...`);
          }

          txs.push(this.createContractAndWait(config, {
            from: coinbase,
            gas: 3141592,
            //gasPrice: 50000000000, // 50 Shannon
            gasPrice: 100000000000, // 100 Shannon
            data: contract_class.binary
          }));
        }

        Promise.all(txs).then(function(addresses) {
          for (var i = 0; i < addresses.length; i++) {
            var address = addresses[i];
            var key = config.app.resolved.deploy[i];
            var contract_class = config.contracts.classes[key];
            contract_class.address = address;
          }
          c();
        }).catch(function(err) {
          c(new DeployError(err.message, key));
        });
      },
      (c) => {
        this.write_contracts(config, "contract files", c);
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
