const debug = require("debug")("provider");
const Web3 = require("web3");
const { Web3Shim, InterfaceAdapter } = require("@truffle/interface-adapter");
const wrapper = require("./wrapper");
const DEFAULT_NETWORK_CHECK_TIMEOUT = 5000;

module.exports = {
  wrap: function(provider, options) {
    return wrapper.wrap(provider, options);
  },

  create: function(options) {
    const provider = this.getProvider(options);
    return this.wrap(provider, options);
  },

  getProvider: function(options) {
    let provider;
    if (options.provider && typeof options.provider === "function") {
      provider = options.provider();
    } else if (options.provider) {
      provider = options.provider;
    } else if (options.websockets) {
      provider = new Web3.providers.WebsocketProvider(
        "ws://" + options.host + ":" + options.port
      );
    } else {
      provider = new Web3.providers.HttpProvider(
        `http://${options.host}:${options.port}`,
        { keepAlive: false }
      );
    }
    return provider;
  },

  testConnection: function(options) {
    let networkCheckTimeout, networkType;
    const { networks, network } = options;
    if (networks && networks[network]) {
      networkCheckTimeout =
        networks[network].networkCheckTimeout || DEFAULT_NETWORK_CHECK_TIMEOUT;
      networkType = networks[network].type;
    } else {
      networkCheckTimeout = DEFAULT_NETWORK_CHECK_TIMEOUT;
    }
    const provider = this.getProvider(options);
    const web3 = new Web3Shim({ provider, networkType });
    const interfaceAdapter = new InterfaceAdapter({ provider, networkType });
    return new Promise((resolve, reject) => {
      const noResponseFromNetworkCall = setTimeout(() => {
        const errorMessage =
          "There was a timeout while attempting to connect to the network." +
          "\n       Check to see that your provider is valid.\n       If you " +
          "have a slow internet connection, try configuring a longer " +
          "timeout in your Truffle config. Use the " +
          "networks[networkName].networkCheckTimeout property to do this.";
        throw new Error(errorMessage);
      }, networkCheckTimeout);
      web3.eth
        .getBlockNumber()
        .then(() => {
          clearTimeout(noResponseFromNetworkCall);
          resolve(true);
        })
        .catch(error => {
          console.log(
            "> Something went wrong while attempting to connect " +
              "to the network. Check your network configuration."
          );
          clearTimeout(noResponseFromNetworkCall);
          reject(error);
        });
    });
  }
};
