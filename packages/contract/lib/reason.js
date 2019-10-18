/**
 * Methods to fetch and decode reason string from ganache when a tx errors.
 */

const reason = {
  /**
   * Extracts a reason string from `eth_call` response
   * @param  {Object}           res  response from `eth_call` to extract reason
   * @param  {adapter}             adapter a helpful friend
   * @return {String|Undefined}      decoded reason string
   */
  _extract: function(res, adapter) {
    if (!res || (!res.error && !res.result)) return;

    const errorStringHash = "0x08c379a0";

    const isObject =
      res && typeof res === "object" && res.error && res.error.data;
    const isString =
      res && typeof res === "object" && typeof res.result === "string";

    if (isObject) {
      const data = res.error.data;
      const hash = Object.keys(data)[0];

      if (data[hash].return && data[hash].return.includes(errorStringHash)) {
        return adapter.eth.abi.decodeParameter(
          "string",
          data[hash].return.slice(10)
        );
      }
    } else if (isString && res.result.includes(errorStringHash)) {
      return adapter.eth.abi.decodeParameter("string", res.result.slice(10));
    }
  },

  /**
   * Runs tx via `eth_call` and resolves a reason string if it exists on the response.
   * @param  {Object} adapter
   * @return {String|Undefined}
   */
  get: function(params, adapter) {
    const packet = {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [params, "latest"],
      id: new Date().getTime()
    };

    return new Promise(resolve => {
      adapter.currentProvider.send(packet, (err, response) => {
        const reasonString = reason._extract(response, adapter);
        resolve(reasonString);
      });
    });
  }
};

module.exports = reason;
