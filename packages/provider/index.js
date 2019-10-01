var debug = require("debug")("provider");
var Web3 = require("web3");
var { Web3Shim } = require("@truffle/interface-adapter");

var wrapper = require("./wrapper");

module.exports = {
  wrap: function(provider, options) {
    return wrapper.wrap(provider, options);
  },

  create: async function(options) {
    var provider;

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

    try {
      await this.testConnection(provider);
      return this.wrap(provider, options);
    } catch (error) {
      const rpcErrorMessage = `Invalid JSON RPC response`;
      if (error.message.includes(rpcErrorMessage)) {
        const message =
          `There was a problem connecting with the provider ` +
          `that you supplied. \nPlease ensure that you supplied a valid ` +
          `provider in your config.`;
        throw new Error(message);
      }
      throw error;
    }
  },

  testConnection: provider => {
    const web3 = new Web3Shim({ provider });
    return web3.eth.getBlockNumber();
  }
};
