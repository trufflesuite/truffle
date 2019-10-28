const debug = require("debug")("provider");
const Web3 = require("web3");
const wrapper = require("./wrapper");

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

  testConnection: function(web3, interfaceAdapter) {
    return new Promise((resolve, reject) => {
      console.log("Testing the provider...");
      console.log("=======================");
      const noResponseFromNetworkCall = setTimeout(() => {
        console.log(
          "> There was a timeout while attempting to connect " +
            "to the network."
        );
        const errorMessage =
          "Failed to connect to the network using the " +
          "supplied provider.\n       Check to see that your provider is valid.";
        throw new Error(errorMessage);
      }, 20000);
      web3.eth
        .getBlockNumber()
        .then(() => {
          console.log("> The test was successful!");
          clearTimeout(noResponseFromNetworkCall);
          resolve(true);
        })
        .catch(error => {
          console.log(
            "> Something went wrong while attempting to connect " +
              "to the network."
          );
          clearTimeout(noResponseFromNetworkCall);
          reject(error);
        });
    });
  }
};
