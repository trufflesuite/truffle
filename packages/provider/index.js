const debug = require("debug")("provider");
const Web3 = require("web3");
const { createInterfaceAdapter } = require("@truffle/interface-adapter");
const wrapper = require("./wrapper");
const DEFAULT_NETWORK_CHECK_TIMEOUT = 5000;

module.exports = {
  wrap: function (provider, options) {
    return wrapper.wrap(provider, options);
  },

  create: function (options) {
    const provider = this.getProvider(options);
    return this.wrap(provider, options);
  },

  getProvider: function (options) {
    let provider;
    if (options.provider && typeof options.provider === "function") {
      provider = options.provider();
    } else if (options.provider) {
      provider = options.provider;
    } else if (options.websockets || /^wss?:\/\//.test(options.url)) {
      provider = new Web3.providers.WebsocketProvider(
        options.url || "ws://" + options.host + ":" + options.port
      );
    } else {
      provider = new Web3.providers.HttpProvider(
        options.url || `http://${options.host}:${options.port}`,
        { keepAlive: false }
      );
    }
    return provider;
  },

  testConnection: function (options) {
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
    const { host } = provider;
    const interfaceAdapter = createInterfaceAdapter({ provider, networkType });
    return new Promise((resolve, reject) => {
      const noResponseFromNetworkCall = setTimeout(() => {
        const errorMessage =
          "There was a timeout while attempting to connect to the network at " + host + 
          ".\n       Check to see that your provider is valid." +
          "\n       If you have a slow internet connection, try configuring a longer " +
          "timeout in your Truffle config. Use the " +
          "networks[networkName].networkCheckTimeout property to do this.";
        throw new Error(errorMessage);
      }, networkCheckTimeout);

      let networkCheckDelay = 1;
      (function networkCheck() {
        setTimeout(async () => {
          try {
            await interfaceAdapter.getBlockNumber();
            clearTimeout(noResponseFromNetworkCall);
            clearTimeout(networkCheck);
            return resolve(true);
          } catch (error) {            
            console.log(
              "> Something went wrong while attempting to connect to the " +
                "network at " + host + ". Check your network configuration."
            );
            clearTimeout(noResponseFromNetworkCall);
            clearTimeout(networkCheck);
            return reject(error);
          }
          networkCheckDelay *= 2;
          networkCheck();
        }, networkCheckDelay);
      })();
    });
  },
};
