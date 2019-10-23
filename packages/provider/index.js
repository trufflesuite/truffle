const debug = require("debug")("provider");
const Web3 = require("web3");
const { Web3Shim, InterfaceAdapter } = require("@truffle/interface-adapter");
const wrapper = require("./wrapper");
const ora = require("ora");

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
    const provider = this.getProvider(options);
    const web3 = new Web3Shim({ provider });
    return new Promise((resolve, reject) => {
      const spinner = ora("Testing the provider.").start();
      const noResponseFromNetworkCall = setTimeout(() => {
        spinner.fail();
        const errorMessage =
          "Failed to connect to the network using the " +
          "supplied provider.\n       Check to see that your provider is valid.";
        throw new Error(errorMessage);
      }, 20000);
      web3.eth
        .getBlockNumber()
        .then(() => {
          spinner.succeed();
          // Cancel the setTimeout check above
          clearTimeout(noResponseFromNetworkCall);
          resolve(true);
        })
        .catch(error => {
          spinner.fail();
          // Cancel the setTimeout check above
          clearTimeout(noResponseFromNetworkCall);
          reject(error);
        });
    });
  }
};
