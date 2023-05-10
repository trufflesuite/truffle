const debug = require("debug")("provider:wrapper"); // eslint-disable-line no-unused-vars
const ProviderError = require("./error");

function make1193ProviderRequest(provider) {
  /*
  NOTE: If truffle switches to use WebSockets instead of HTTP requests in the future
        then we will need to keep separate requestId counters for .request and .send
        methods to avoid collision while generating requestIds on parallel requests.
  */
  let requestId = 0;
  const modifiedRequest = async function ({ method, params }) {
    return await new Promise((accept, reject) => {
      provider.send(
        {
          jsonrpc: "2.0",
          id: ++requestId,
          method,
          params
        },
        (error, response) => {
          if (error) {
            return reject(error);
          }
          if (response.error) {
            const error = new Error(response.error.message);
            error.code = response.error.code;
            if (response.error.data) {
              error.data = response.error.data;
            }
            return reject(error);
          }
          const { result: res } = response;
          accept(res);
        }
      );
    });
  };
  return modifiedRequest.bind(provider);
}

module.exports = {
  /*
   * Web3.js Transport Wrapper
   *
   * Wraps an underlying web3 provider's RPC transport methods (send/sendAsync)
   * for Truffle-specific purposes, mainly for logging / request verbosity.
   */
  wrap: function (provider, options) {
    /* wrapping should be idempotent */
    if (provider._alreadyWrapped) return provider;

    /* setup options defaults */
    options = options || {};
    // custom logger
    options.logger = options.logger || console;
    // to see what web3 is sending and receiving.
    options.verbose = options.verbose || options.verboseRpc || false;

    /* create wrapper functions for before/after send/sendAsync */
    const preHook = this.preHook(options);
    const postHook = this.postHook(options);

    const originalSend = provider.send.bind(provider);

    /* overwrite method */
    provider.send = this.send(originalSend, preHook, postHook);
    // overwrite sendAsync only when sendAsync is used.
    if (provider.sendAsync) {
      const originalSendAsync = provider.sendAsync.bind(provider);
      provider.sendAsync = this.send(originalSendAsync, preHook, postHook);
    }

    // EIP-1193 provider wrapping
    if (provider.request === undefined && provider.send !== undefined) {
      provider.request = make1193ProviderRequest(provider);
    }

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
  preHook: function (options) {
    return function (payload) {
      if (options.verbose) {
        // for request payload debugging
        options.logger.log(
          "   > " + JSON.stringify(payload, null, 2).split("\n").join("\n   > ")
        );
      }

      if (options.events) {
        options.events.emit("rpc:request", { payload });
      }
      return payload;
    };
  },

  // after send/sendAsync
  postHook: function (options) {
    return function (payload, error, result) {
      // web3 websocket providers return false and web3 http providers
      // return null when no error has occurred...kind of obnoxious
      if (error) {
        error = new ProviderError(error.message, {
          ...options,
          underlyingError: error
        });
      }

      if (result && options.verbose) {
        options.logger.log(
          " <   " + JSON.stringify(result, null, 2).split("\n").join("\n <   ")
        );
      }

      if (options.events) {
        options.events.emit(
          "rpc:result",
          error ? { payload, error } : { payload, result }
        );
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
  send: function (originalSend, preHook, postHook) {
    return function (payload, callback) {
      payload = preHook(payload);

      originalSend(payload, function (error, result) {
        const modified = postHook(payload, error, result);
        payload = modified[0];
        error = modified[1];
        result = modified[2];

        callback(error, result);
      });
    };
  }
};
