var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var Compiler = require("./compiler");
var Pudding = require("ether-pudding");
var Web3 = require("web3");
var expect = require("./expect");

var Contracts = {

  // fetch_accounts is a bug fix for the build process, to stop the build
  // from making a request to an RPC client. In the future it should eventually
  // be removed, and the build process shouldn't even run into a sitution where it
  // needs to fetch anything.
  provision: function(options, fetch_accounts, callback) {
    var self = this;
    var logger = options.logger || console;
    var web3 = new Web3();
    web3.setProvider(options.provider);

    if (typeof fetch_accounts == "function") {
      callback = fetch_accounts;
      fetch_accounts = true;
    }

    if (fetch_accounts !== false) {
      fetch_accounts = true;
    }

    function getAccounts(cb) {
      if (!fetch_accounts) {
        return cb();
      }

      web3.eth.getAccounts(cb);
    };

    Pudding.requireAll({
      source_directory: options.contracts_build_directory,
      provider: options.provider
    }, function(err, contracts) {
      if (err) return callback(err);

      getAccounts(function(err, accounts) {
        if (err) return callback(err);

        // Add contracts to context and prepare contracts.
        contracts.forEach(function(contract) {
          var defaults = {};

          if (options.rpc) {
            defaults.from = options.rpc.from;
            defaults.gas = options.rpc.gas;
            defaults.gasPrice = options.rpc.gasPrice;
          }

          if (accounts && accounts[0] && !defaults.from) {
            defaults.from = accounts[0];
          }

          // Web3 can be strict about what it supports, and even null can make it error.
          if (!defaults.from) {
            delete defaults.from;
          }

          // Set defaults based on configuration.
          contract.defaults(defaults);

          if (options.network_id) {
            contract.setNetwork(options.network_id);
          }
        });

        callback(null, contracts);
      });
    });
  },

  // contracts_directory: String. Directory where .sol files can be found.
  // contracts_build_directory: String. Directory where .sol.js files can be found and written to.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // network_id: network id to link saved contract artifacts.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile: function(options, callback) {
    var self = this;

    expect.options(options, [
      "contracts_directory",
      "contracts_build_directory",
      "network",
      "network_id"
    ]);

    function finished(err, contracts) {
      if (err) return callback(err);

      if (contracts != null && Object.keys(contracts).length > 0) {
        self.write_contracts(contracts, options, callback);
      } else {
        callback(null, []);
      }
    };

    if (options.all === true || options.compileAll === true) {
      Compiler.compile_all(options, finished);
    } else {
      Compiler.compile_necessary(options, finished);
    }
  },

  write_contracts: function(contracts, options, callback) {
    var logger = options.logger || console;

    mkdirp(options.contracts_build_directory, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      if (options.quiet != true && options.quietWrite != true) {
        logger.log("Writing artifacts to ." + path.sep + path.relative(process.cwd(), options.contracts_build_directory));
      }

      Pudding.saveAll(contracts, options.contracts_build_directory, options).then(function() {
        callback(null, contracts);
      }).catch(callback);
    });
  }
}

module.exports = Contracts;
