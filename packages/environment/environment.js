const Web3 = require("web3");
const { createInterfaceAdapter } = require("@truffle/interface-adapter");
const expect = require("@truffle/expect");
const TruffleError = require("@truffle/error");
const Resolver = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");
const Ganache = require("ganache");
const Provider = require("@truffle/provider");

const Environment = {
  // It's important config is a Config object and not a vanilla object
  detect: async function (config) {
    expect.options(config, ["networks"]);

    helpers.setUpConfig(config);
    helpers.validateNetworkConfig(config);

    const interfaceAdapter = createInterfaceAdapter({
      provider: config.provider,
      networkType: config.networks[config.network].type
    });

    await Provider.testConnection(config);
    await helpers.detectAndSetNetworkId(config, interfaceAdapter);
    await helpers.setFromOnConfig(config, interfaceAdapter);
  },

  // Ensure you call Environment.detect() first.
  fork: async function (config) {
    expect.options(config, ["from", "provider", "networks", "network"]);

    const interfaceAdapter = createInterfaceAdapter({
      provider: config.provider,
      networkType: config.networks[config.network].type
    });

    let accounts;
    try {
      accounts = await interfaceAdapter.getAccounts();
    } catch {
      // don't prevent Truffle from working if user doesn't provide some way
      // to sign transactions (e.g. no reason to disallow debugging)
      accounts = [];
    }
    const block = await interfaceAdapter.getBlock("latest");

    const upstreamNetwork = config.network;
    const upstreamConfig = config.networks[upstreamNetwork];
    const forkedNetwork = config.network + "-fork";
    const ganacheOptions = {
      fork: config.provider,
      gasLimit: block.gasLimit
    };
    if (accounts.length > 0) ganacheOptions.unlocked_accounts = accounts;

    config.networks[forkedNetwork] = {
      network_id: config.network_id,
      provider: Ganache.provider(ganacheOptions),
      from: config.from,
      gas: upstreamConfig.gas,
      gasPrice: upstreamConfig.gasPrice
    };
    config.network = forkedNetwork;
  },

  develop: async (config, ganacheOptions) => {
    expect.options(config, ["networks"]);

    const network = config.network || "develop";
    const url = `http://${ganacheOptions.host}:${ganacheOptions.port}/`;

    config.networks[network] = {
      ...config.networks[network],
      network_id: ganacheOptions.network_id,
      provider: function () {
        return new Web3.providers.HttpProvider(url, { keepAlive: false });
      }
    };

    config.network = network;

    return await Environment.detect(config);
  }
};

const helpers = {
  setFromOnConfig: async (config, interfaceAdapter) => {
    if (config.from) return;

    try {
      const accounts = await interfaceAdapter.getAccounts();
      config.networks[config.network].from = accounts[0];
    } catch {
      // don't prevent Truffle from working if user doesn't provide some way
      // to sign transactions (e.g. no reason to disallow debugging)
    }
  },

  detectAndSetNetworkId: async (config, interfaceAdapter) => {
    const configNetworkId = config.networks[config.network].network_id;
    const providerNetworkId = await interfaceAdapter.getNetworkId();
    if (configNetworkId !== "*") {
      // Ensure the network id matches the one in the config for safety
      if (providerNetworkId.toString() !== configNetworkId.toString()) {
        const error =
          `The network id specified in the truffle config ` +
          `(${configNetworkId}) does not match the one returned by the network ` +
          `(${providerNetworkId}).  Ensure that both the network and the ` +
          `provider are properly configured.`;
        throw new Error(error);
      }
    } else {
      // We have a "*" network. Get the current network and replace it with the real one.
      // TODO: Should we replace this with the blockchain uri?
      config.networks[config.network].network_id = providerNetworkId;
    }
  },

  validateNetworkConfig: config => {
    const networkConfig = config.networks[config.network];

    if (!networkConfig) {
      throw new TruffleError(
        `Unknown network "${config.network}` +
          `". See your Truffle configuration file for available networks.`
      );
    }

    const configNetworkId = config.networks[config.network].network_id;

    if (configNetworkId == null) {
      throw new Error(
        `You must specify a network_id in your '` +
          `${config.network}' configuration in order to use this network.`
      );
    }
  },

  setUpConfig: config => {
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

    const currentNetworkSettings = config.networks[config.network];
    if (
      currentNetworkSettings &&
      currentNetworkSettings.ens &&
      currentNetworkSettings.ens.registry
    ) {
      config.ens.registryAddress = currentNetworkSettings.ens.registry.address;
    }
  }
};

module.exports = Environment;
