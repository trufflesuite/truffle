var web3 = require("web3");
var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var provision = require("./provision");
var ConfigurationError = require("./errors/configurationerror");

var Contracts = {
  resolve(root, callback) {
    var imported = {};

    var import_file = function(file) {
      var code = fs.readFileSync(file, "utf-8");

      // Remove comments
      code = code.replace(/(\/\/.*(\n|$))/g, "");
      code = code.replace(/(\/\*(.|\n)*?\*\/)/g, "");
      code = code.replace("*/", ""); // Edge case.

      // Perform imports.
      code = code.replace(/import ('|")[^'"]+('|");/g, function(match) {
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

        return import_file(import_path) + "\n\n";
      });
      return code;
    };

    try {
      callback(null, import_file(root));
    } catch(e) {
      callback(e);
    }
  },

  // Support the breaking change that made sendTransaction return a transaction
  // hash instead of an address hash when committing a new contract.
  get_contract_address(config, address_or_tx, callback) {
    if (address_or_tx.length == 42) {
      callback(null, address_or_tx);
      return;
    }

    var attempts = 0;
    var max_attempts = 120;

    var interval = null;
    var verify = function() {
      // Call the method via the provider directly as it hasn't yet been
      // implemented in web3.
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params:[address_or_tx],
        id: new Date().getTime()
      }, function(err, result) {
        if (err != null) {
          callback(err);
          return;
        }

        result = result.result;

        // Gotta love inconsistent responses.
        if (result != null && result != "" && result != "0x") {
          clearInterval(interval);
          callback(null, result.contractAddress);
          return;
        }

        attempts += 1;

        if (attempts >= max_attempts) {
          clearInterval(interval);
          callback(new Error(`Contracts not deployed after ${attempts} seconds!`));
        }
      });
    };

    interval = setInterval(verify, 1000);
  },

  check_for_valid_compiler(file, callback) {
    var compiler_name = null;

    if (path.extname(file) == ".sol") {
      compiler_name = "solidity";
    }

    if (compiler_name == null) {
      callback(new Error(`Compiler for ${path.extname(file)} not yet supported by Truffle. We hope to support every compiler eventually. Express your interested by filing a bug report on Github.`));
      return;
    }

    web3.eth.getCompilers(function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      // Make all compiler names lower case for comparison.
      result = result.map(function(x) {
        return x.toLowerCase();
      });

      if (result.indexOf(compiler_name) < 0) {
        callback(new Error(`Your RPC client doesn't support compiling files with the ${path.extname(file)} extension. Please make sure you have the relevant compilers installed and your RPC client is configured correctly. The compilers supported by your RPC client are: [${result.join(', ')}]`));
        return;
      }

      callback();
    });
  },

  compile_all(config, callback) {
    async.mapSeries(Object.keys(config.contracts.classes), (key, finished) => {
      var contract = config.contracts.classes[key];
      var source = contract.source;

      var display_name = source.substring(source.lastIndexOf("/") + 1);
      if (config.argv.quietDeploy == null) {
        console.log(`Compiling ${display_name}...`);
      }

      this.check_for_valid_compiler(source, (err) => {
        if (err != null) {
          finished(err);
          return;
        }

        this.resolve(source, function(err, code) {
          if (err != null) {
            finished(err);
            return;
          }

          web3.eth.compile.solidity(code, function(err, result) {
            if (err != null) {
              finished(err, result);
              return;
            }

            contract["binary"] = result[key].code;
            contract["abi"] = result[key].info.abiDefinition;
            finished(null, contract);
          });
        });
      });
    }, function(err, result) {
      if (err != null) {
        console.log("");
        console.log(err.message);
        console.log("");
        console.log("Hint: Some clients don't send helpful error messages through the RPC. See client logs for more details.");
        err = new ConfigurationError("Compilation failed. See above.");
      }
      callback(err)
    });
  },

  write_contracts(config, description="contracts", callback) {
    mkdirp(config.environments.current.directory, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      var display_directory = "." + config.environments.current.contracts_filename.replace(config.working_dir, "");
      if (config.argv.quietDeploy == null) {
        console.log(`Writing ${description} to ${display_directory}`);
      }

      fs.writeFileSync(config.environments.current.contracts_filename, JSON.stringify(config.contracts.classes, null, 2), {flag: "w+"});
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

  deploy(config, compile=true, done_deploying) {
    var coinbase = null;

    async.series([
      (c) => {
        web3.eth.getCoinbase(function(error, result) {
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
        // Put them on the network
        var provisioner = provision.asModule(config);
        provisioner.provision_contracts(global);

        async.mapSeries(config.app.resolved.deploy, (key, callback) => {
          var contract = global[key]; //config.contracts.classes[key];
          var contract_class = config.contracts.classes[key];

          if (contract == null) {
            callback(new Error(`Could not find contract '${key}' for deployment. Check app.json.`));
            return;
          }

          var display_name = contract_class.source.substring(contract_class.source.lastIndexOf("/") + 1);
          if (config.argv.quietDeploy == null) {
            console.log(`Sending ${display_name} to the network...`);
          }

          contract.new({
            from: coinbase,
            gas: 3141592,
            gasPrice: 1000000000000 // I'm not sure why this is so high. geth made me do it.
          }).then(function(instance) {
            contract_class.address = instance.address;
            callback(null, contract_class);
          }).catch(callback);

        }, function(err, results) {
          if (err != null) {
            console.log("ERROR sending contract:");
            c(err);
          } else {
            c();
          }
        });
      }
    ], (err) => {
      if (err != null) {
        done_deploying(err);
        return;
      }

      this.write_contracts(config, "contracts and deployed addresses", done_deploying);
    });
  }
}

module.exports = Contracts;
