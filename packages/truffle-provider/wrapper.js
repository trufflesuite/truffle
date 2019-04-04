var debug = require("debug")("provider:wrapper"); // eslint-disable-line no-unused-vars
var ProviderError = require("./error");

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

    /* overwrite method */
    provider.send = this.send(originalSend, preHook, postHook);

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
    return function(method, params) {
      if (options.verbose) {
        // for request payload debugging
        options.logger.log(
          "   > " +
            JSON.stringify(method, params, null, 2)
              .split("\n")
              .join("\n   > ")
        );
      }

      return { method, params };
    };
  },

  // after send/sendAsync
  postHook: function(options) {
    return function(method, params, result) {
      if (options.verbose) {
        options.logger.log(
          " <   " +
            JSON.stringify(result, null, 2)
              .split("\n")
              .join("\n <   ")
        );
      }
      return result;
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
  send: function(originalSend, preHook, postHook) {
    return function(inputMethod, inputParams) {
      return new Promise((resolve, reject) => {
        let { method, params } = preHook(inputMethod, inputParams);

        return originalSend(method, params)
          .then(result => {
            const modifiedResult = postHook(method, params, result);
            resolve(modifiedResult);
          })
          .catch(error => {
            // wrap errors in internal error class
            error = new ProviderError(error.message, options);
            reject(error);
          });
      });
    };
  }
};
