var Web3 = require("truffle-migrate-legacy/node_modules/web3");
var TruffleError = require("truffle-error");
var expect = require("truffle-expect");
var Resolver = require("truffle-migrate-legacy/node_modules/truffle-resolver");
var Artifactor = require("truffle-artifactor");
var Ganache = require("ganache-core");

var Environment = {
  // It's important config is a Config object and not a vanilla object
  detect: function(config, callback) {
    expect.options(config, ["networks"]);

    if (!config.resolver) {
      config.resolver = new Resolver(config);
    }

    if (!config.artifactor) {
      config.artifactor = new Artifactor(config.contracts_build_directory);
    }

    if (!config.network && config.networks["development"]) {
      config.network = "development";
    }

    if (!config.network) {
      return callback(
        new Error("No network specified. Cannot determine current network.")
      );
    }

    var network_config = config.networks[config.network];

    if (!network_config) {
      return callback(
        new TruffleError(
          'Unknown network "' +
            config.network +
            '". See your Truffle configuration file for available networks.'
        )
      );
    }

    var network_id = config.networks[config.network].network_id;

    if (network_id == null) {
      return callback(
        new Error(
          "You must specify a network_id in your '" +
            config.network +
            "' configuration in order to use this network."
        )
      );
    }

    var web3 = new Web3(config.provider);

    function detectNetworkId(done) {
      if (network_id != "*") {
        return done(null, network_id);
      }

      // We have a "*" network. Get the current network and replace it with the real one.
      // TODO: Should we replace this with the blockchain uri?
      web3.version.getNetwork(function(err, id) {
        if (err) return callback(err);
        network_id = id;
        config.networks[config.network].network_id = network_id;
        done(null, network_id);
      });
    }

    function detectFromAddress(done) {
      if (config.from) {
        return done();
      }

      web3.eth.getAccounts(function(err, accounts) {
        if (err) return done(err);
        config.networks[config.network].from = accounts[0];
        done();
      });
    }

    detectNetworkId(function(err) {
      if (err) return callback(err);
      detectFromAddress(callback);
    });
  },

  // Ensure you call Environment.detect() first.
  fork: function(config, callback) {
    expect.options(config, ["from"]);

    var web3 = new Web3(config.provider);

    web3.eth.getAccounts(function(err, accounts) {
      if (err) return callback(err);

      var upstreamNetwork = config.network;
      var upstreamConfig = config.networks[upstreamNetwork];
      var forkedNetwork = config.network + "-fork";

      config.networks[forkedNetwork] = {
        network_id: config.network_id,
        provider: Ganache.provider({
          fork: config.provider,
          unlocked_accounts: accounts
        }),
        from: config.from,
        gas: upstreamConfig.gas,
        gasPrice: upstreamConfig.gasPrice
      };
      config.network = forkedNetwork;

      callback();
    });
  },

  develop: function(config, ganacheOptions, callback) {
    expect.options(config, ["networks"]);

    var network = config.network || "develop";
    var url = `http://${ganacheOptions.host}:${ganacheOptions.port}/`;

    config.networks[network] = {
      network_id: ganacheOptions.network_id,
      provider: function() {
        return new Web3.providers.HttpProvider(url);
      }
    };

    config.network = network;

    Environment.detect(config, callback);
  }
};

module.exports = Environment;
