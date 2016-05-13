module.exports = {
  wrap: function(provider, options) {
    if (options.verbose || options.verboseRpc) {
      this.makeVerbose(provider, options.logger);
    }
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
  }
};
