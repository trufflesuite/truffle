var Web3 = require("web3");
var expect = require("truffle-expect");

// TODO: Look into removing these dependencies.
var parallel = require("async/parallel");
var _ = require("lodash");

// fetch_accounts is a bug fix for the build process, to stop the build
// from making a request to an RPC client. In the future it should eventually
// be removed, and the build process shouldn't even run into a sitution where it
// needs to fetch anything.

var provision = function(options, fetch_accounts, callback) {
  var self = this;
  var logger = options.logger || console;
  var web3 = new Web3();
  web3.setProvider(options.provider);

  expect.options(options, [
    "provider",
    "sources"
  ]);

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

  var provisioners = options.sources.map(function(source) {
    return source.provision_contracts.bind(source);
  });

  parallel(provisioners, function(err, contract_lists) {
    if (err) return callback(err);

    // Merge lists, backwards first as first source takes precedence
    var master = _.extend.apply(_, contract_lists.reverse());

    // Turn list into an array
    var contracts = Object.keys(master).map(function(key) {
      return master[key];
    });

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
};

module.exports = provision;
