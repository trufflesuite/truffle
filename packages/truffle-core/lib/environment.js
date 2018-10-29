var Web3 = require("web3");
var TruffleError = require("truffle-error");
var expect = require("truffle-expect");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");
var TestRPC = require("ganache-cli");

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

    if (!config.network) {
      if (config.networks["development"]) {
        config.network = "development";
      } else {
        config.network = "ganache";
        config.networks[config.network] = {
          host: "127.0.0.1",
          port: 7545,
          network_id: 5777
        };
      }
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
      web3.eth.net
        .getId()
        .then(id => {
          network_id = id;
          config.networks[config.network].network_id = network_id;
          done(null, network_id);
        })
        .catch(callback);
    }

    function detectFromAddress(done) {
      if (config.from) {
        return done();
      }

      web3.eth
        .getAccounts()
        .then(accounts => {
          config.networks[config.network].from = accounts[0];
          done();
        })
        .catch(done);
    }

    detectNetworkId(function(err) {
      if (err) return callback(err);
      detectFromAddress(callback);
    });
  },

  // Ensure you call Environment.detect() first.
  fork: async function(config, callback) {
    expect.options(config, ["from"]);

    var web3 = new Web3(config.provider);

    try {
      var accounts = await web3.eth.getAccounts();
      var block = await web3.eth.getBlock("latest");

      var upstreamNetwork = config.network;
      var upstreamConfig = config.networks[upstreamNetwork];
      var forkedNetwork = config.network + "-fork";

      config.networks[forkedNetwork] = {
        network_id: config.network_id,
        provider: TestRPC.provider({
          fork: config.provider,
          unlocked_accounts: accounts,
          gasLimit: block.gasLimit
        }),
        from: config.from,
        gas: upstreamConfig.gas,
        gasPrice: upstreamConfig.gasPrice
      };
      config.network = forkedNetwork;

      callback();
    } catch (err) {
      callback(err);
    }
  },

  develop: function(config, testrpcOptions, callback) {
    expect.options(config, ["networks"]);

    var network = config.network || "develop";
    var url = `http://${testrpcOptions.host}:${testrpcOptions.port}/`;

    config.networks[network] = {
      network_id: testrpcOptions.network_id,
      provider: function() {
        return new Web3.providers.HttpProvider(url);
      }
    };

    config.network = network;

    Environment.detect(config, callback);
  }
};

module.exports = Environment;
