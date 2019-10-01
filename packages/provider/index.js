var debug = require("debug")("provider");
var Web3 = require("web3");
var { Web3Shim } = require("@truffle/interface-adapter");

var wrapper = require("./wrapper");

module.exports = {
  wrap: function(provider, options) {
    return wrapper.wrap(provider, options);
  },

  create: function(options) {
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

    return this.wrap(provider, options);
  },

  testConnection: async provider => {
    const web3 = new Web3Shim({ provider });
    await web3.eth.getBlockNumber();
    return true;
  }
};
