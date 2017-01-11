var Web3 = require("web3");

module.exports = {
  wrap: function(provider, options) {
    options = options || {};

    if (options.verbose || options.verboseRpc) {
      this.makeVerbose(provider, options.logger);
    }
    return provider;
  },

  makeVerbose: function(provider, logger) {
    logger = logger || console;

    // // If you want to see what web3 is sending and receiving.
    var oldAsync = provider.sendAsync;

    if (oldAsync.is_verbose) return;

    provider.sendAsync = function(options, callback) {
      logger.log("   > " + JSON.stringify(options, null, 2).split("\n").join("\n   > "));
      oldAsync.call(provider, options, function(error, result) {
        if (error == null) {
          logger.log(" <   " + JSON.stringify(result, null, 2).split("\n").join("\n <   "));
        }
        callback(error, result)
      });
    };

    provider.sendAsync.is_verbose = true;
  },

  create: function(options) {
    var provider;

    if (options.provider) {
      provider = options.provider;
    } else {
      provider = new Web3.providers.HttpProvider("http://" + options.host + ":" + options.port);
    }

    return this.wrap(provider, options);
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
