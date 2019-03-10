const Web3 = require("web3");
const Web3Shim = require("truffle-interface-adapter").Web3Shim;
const TruffleError = require("truffle-error");
const expect = require("truffle-expect");
const Resolver = require("truffle-resolver");
const Artifactor = require("truffle-artifactor");
const Ganache = require("ganache-core");
const { callbackify } = require("util");

const Environment = {
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

    var web3 = new Web3Shim({
      provider: config.provider,
      networkType: config.networks[config.network].type
    });

    async function detectNetworkId() {
      const providerNetworkId = await web3.eth.net.getId();
      if (network_id !== "*") {
        // Ensure the network id matches the one in the config for safety
        if (providerNetworkId.toString() !== network_id.toString()) {
          const error =
            `The network id specified in the truffle config ` +
            `(${network_id}) does not match the one returned by the network ` +
            `(${providerNetworkId}).  Ensure that both the network and the ` +
            `provider are properly configured.`;
          throw new Error(error);
        }
        return network_id;
      } else {
        // We have a "*" network. Get the current network and replace it with the real one.
        // TODO: Should we replace this with the blockchain uri?
        config.networks[config.network].network_id = providerNetworkId;
        return network_id;
      }
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

    callbackify(detectNetworkId)(err => {
      if (err) return callback(err);
      detectFromAddress(callback);
    });
  },

  // Ensure you call Environment.detect() first.
  fork: async function(config, callback) {
    expect.options(config, ["from", "provider", "networks", "network"]);

    var web3 = new Web3Shim({
      provider: config.provider,
      networkType: config.networks[config.network].type
    });

    try {
      var accounts = await web3.eth.getAccounts();
      var block = await web3.eth.getBlock("latest");

      var upstreamNetwork = config.network;
      var upstreamConfig = config.networks[upstreamNetwork];
      var forkedNetwork = config.network + "-fork";

      config.networks[forkedNetwork] = {
        network_id: config.network_id,
        provider: Ganache.provider({
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

  develop: function(config, ganacheOptions, callback) {
    expect.options(config, ["networks"]);

    var network = config.network || "develop";
    var url = `http://${ganacheOptions.host}:${ganacheOptions.port}/`;

    config.networks[network] = {
      network_id: ganacheOptions.network_id,
      provider: function() {
        return new Web3.providers.HttpProvider(url, { keepAlive: false });
      }
    };

    config.network = network;

    Environment.detect(config, callback);
  }
};

module.exports = Environment;
