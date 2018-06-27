var Web3 = require("web3");

var wrapper = require('./wrapper');


var createUnchecked = function(options) {
  if (options.provider && typeof options.provider == "function") {
    return options.provider();
  } else if (options.provider) {
    return options.provider;
  } else {
    return new Web3.providers.HttpProvider("http://" + options.host + ":" + options.port);
  }
}

module.exports = {
  wrap: function(provider, options) {
    return wrapper.wrap(provider, options);
  },

  create: function(options) {
    var provider = createUnchecked(options);

    if (provider.then && typeof provider.then == "function") {
      throw new Error(
        "Provider factory function returned a Promise, however 'create' is synchronous." +
        " Please call 'createAsync' to enable asynchronous Provider creation." +
        " See https://github.com/trufflesuite/truffle/issues/1054 for more info."
      );
    }

    return this.wrap(provider, options);
  },

  createAsync: function(options) {
    var self = this;
    var provider = createUnchecked(options);

    return Promise.resolve(provider).then(function(provider) {
      return self.wrap(provider, options);
    });
  },

  test_connection: function(provider, callback) {
    var web3 = new Web3();
    web3.setProvider(provider);
    web3.eth.getCoinbase(function(error, coinbase) {
      if (error != null) {
        error = new Error("Could not connect to your RPC client. Please check your RPC configuration.");
      }

      callback(error, coinbase)
    });
  }
};
