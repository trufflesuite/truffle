const debug = require("debug")("provider");
const Web3 = require("web3");
const { Web3Shim } = require("@truffle/interface-adapter");
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

  testConnection: async function(options) {
    const provider = this.getProvider(options);
    const web3 = new Web3Shim({ provider });
    await web3.eth.getBlockNumber();
    return true;
  }
};
