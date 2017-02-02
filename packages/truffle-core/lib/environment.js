var Web3 = require("web3");
var TruffleError = require("truffle-error");
var expect = require("truffle-expect");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");

var Environment = {
  // It's important config is a Config object and not a vanilla object
  detect: function(config, callback) {
    expect.options(config, [
      "networks"
    ]);

    if (!config.resolver) {
      config.resolver = new Resolver(config);
    }

    if (!config.artifactor) {
      config.artifactor = new Artifactor(config.contracts_build_directory)
    }

    if (!config.network && config.networks["development"]) {
      config.network = "development";
    }

    if (!config.network) {
      return callback(new Error("No network specified. Cannot determine current network."));
    }

    var network_config = config.networks[config.network];

    if (!network_config) {
      return callback(new TruffleError("Unknown network \"" + config.network + "\". See your Truffle configuration file for available networks."));
    }

    var network_id = config.networks[config.network].network_id;

    if (network_id == null) {
      return callback(new Error("You must specify a network_id in your '" + config.network + "' configuration in order to use this network."));
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
  }
};

module.exports = Environment;
