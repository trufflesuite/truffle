var ProviderError = require('./error');

module.exports = {
  /*
   * Web3.js Transport Wrapper
   *
   * Wraps an underlying web3 provider's RPC transport methods (send/sendAsync)
   * for Truffle-specific purposes, mainly for logging / request verbosity.
   */
  wrap: function(provider, options) {
    /* wrapping should be idempotent */
    if (provider._alreadyWrapped) return provider;

    /* setup options defaults */
    options = options || {};
    // custom logger
    options.logger = options.logger || console;
    // to see what web3 is sending and receiving.
    options.verbose = options.verbose || options.verboseRpc || false;

    /* create wrapper functions for before/after send */
    var preHook = this.preHook(options);
    var postHook = this.postHook(options);

    var originalSend = provider.send.bind(provider);
    var originalSendAsync = provider.sendAsync.bind(provider);

    /* overwrite methods */
    provider.send = this.send(originalSend, preHook, postHook);
    provider.sendAsync = this.sendAsync(originalSendAsync, preHook, postHook);

    /* mark as wrapped */
    provider._alreadyWrapped = true;

    return provider;
  },

  /*
   * Transport Hook Generators
   *
   * Used to wrap underlying web3.js behavior before/after sending request
   * payloads to the RPC.
   *
   * Transport hooks may be used to perform additional operations before/after
   * sending, and/or to modify request/response data.
   *
   * Each generator accepts an `options` argument and uses it to construct
   * and return a function.
   *
   * Returned functions accept relevant arguments and return potentially new
   * versions of those arguments (for payload/result/error overrides)
   */

  // before send/sendAsync
  preHook: function(options) {
    return function(payload) {
      if (options.verbose) {
        // for request payload debugging
        options.logger.log("   > " + JSON.stringify(payload, null, 2).split("\n").join("\n   > "));
      }

      return payload;
    };
  },

  // after send/sendAsync
  postHook: function(options) {
    return function(payload, error, result) {
      if (error != null) {
        // wrap errors in internal error class
        error = new ProviderError(error.message, error);
        return [payload, error, result];
      }

      if (options.verbose) {
        options.logger.log(" <   " + JSON.stringify(result, null, 2).split("\n").join("\n <   "));
      }

      return [payload, error, result];
    };
  },

  /*
   * Transport Method Generators
   *
   * Generate wrapped versions of `send`/`sendAsync`, given original method and
   * transport hooks.
   *
   * Pre-condition: originals are bound correctly (`send.bind(provider)`)
   *
   * Return the wrapped function matching the original function's signature.
   */

  // wrap a `provider.send` function with behavior hooks
  // returns a function(payload) to replace `provider.send`
  send: function(originalSend, preHook, postHook) {
    return function(payload) {
      var result = null;
      var error = null;

      payload = preHook(payload);

      try {
        result = originalSend(payload);
      } catch (e) {
        error = e;
      }

      var modified = postHook(payload, error, result);
      payload = modified[0];
      error = modified[1];
      result = modified[2];

      if (error != null) {
        throw error;
      }

      return result;
    }
  },

  // wrap a `provider.sendAsync` function with behavior hooks
  // returns a function(payload, callback) to replace `provider.sendAsync`
  sendAsync: function(originalSendAsync, preHook, postHook) {
    return function(payload, callback) {
      payload = preHook(payload);

      originalSendAsync(payload, function(error, result) {
        var modified = postHook(payload, error, result);
        payload = modified[0];
        error = modified[1];
        result = modified[2];

        callback(error, result);
      });
    };
  }
}
