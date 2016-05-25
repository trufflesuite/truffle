var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var Compiler = require("./compiler");
var Require = require("./require");
var Pudding = require("ether-pudding");
var Web3 = require("web3");

var Contracts = {
  account: null,

  provision: function(options, callback) {
    var self = this;
    var logger = options.logger || console;
    var web3 = new Web3();
    web3.setProvider(options.provider);

    Pudding.requireAll({
      source_directory: options.contracts_build_directory,
      provider: options.provider
    }, function(err, contracts) {
      if (err) return callback(err);

      web3.eth.getAccounts(function(err, accounts) {
        if (err) return callback(err);

        // Add contracts to context and prepare contracts.
        contracts.forEach(function(contract) {
          // Set defaults based on configuration.
          contract.defaults({
            from: options.from || accounts[0],
            gas: options.gas,
            gasPrice: options.gasPrice
          });

          if (options.network_id) {
            contract.setNetwork(options.network_id);
          }

          // If all addresses should be reset.
          if (options.reset == true) {
            contract.address = null;
          }
        });

        callback(null, contracts);
      });
    });
  },

  // source_directory: String. Directory where .sol files can be found.
  // contracts_build_directory: String. Directory where .sol.js files can be found and written to.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // network_id: network id to link saved contract artifacts.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile: function(options, callback) {
    var self = this;

    function finished(err, contracts) {
      if (err) return callback(err);

      if (contracts != null && Object.keys(contracts).length > 0) {
        self.write_contracts(contracts, options, callback);
      } else {
        callback();
      }
    };

    if (options.all == false) {
      Compiler.compile_necessary(options, finished);
    } else {
      Compiler.compile_all(options, finished);
    }
  },

  write_contracts: function(contracts, options, callback) {
    mkdirp(options.contracts_build_directory, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      if (options.quiet != true && options.quietWrite != true) {
        console.log("Writing artifacts to ." + path.sep + path.relative(process.cwd(), options.contracts_build_directory));
      }

      Pudding.saveAll(contracts, options.contracts_build_directory, options).then(callback).catch(callback);
    });
  }
}

module.exports = Contracts;
