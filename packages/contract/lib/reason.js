/**
 * Methods to fetch and decode reason string from ganache when a tx errors.
 */

const reason = {
  /**
   * Extracts a reason string from `eth_call` response
   * @param  {Object}           res  response from `eth_call` to extract reason
   * @param  {Web3}             web3 a helpful friend
   * @param  {InterfaceAdapter}      interfaceAdapter a new helpful friend
   * @return {String|Undefined}      decoded reason string
   */
  _extract: function(res, web3, _interfaceAdapter) {
    //I'm not sure why interfaceAdapter is here if it's not used,
    //so I just put an underscore in front of its name for now...
    if (
      !res
      || (
        !res.error
        && (
          !res.result /* ganache 2.0 */
          || (res.error && res.error.data && !res.error.data.result /* ganache 3.0 */)
        )
      )
    ) return;


    const errorStringHash = "0x08c379a0";

    const isObject =
      res && typeof res === "object" && res.error && res.error.data;
    const isString =
      res && typeof res === "object" && typeof res.result === "string";

    if (isObject) {
      // TODO: ganache 2.0 returns the reason string already when
      // vmErrorsOnRPCResponse === true. Why not use it?
      const data = res.error.data;
      let resData;
      if ("result" in data) {
        // there is a single result (only in ganache 3.0+)
        resData = data.result;
      } else {
        // handle `evm_mine`, `miner_start`, batch payloads, and ganache 2.0
        // TODO: there are 1 or more failed transactions, handle multiple?
        const hash = Object.keys(data)[0];
        const errorDetails = data[hash];
        resData =
          errorDetails.result /* ganache 3.0 */
          || errorDetails.return /* ganache 2.0 */;
      }

      if (resData && resData.includes(errorStringHash)) {
        try {
          return web3.eth.abi.decodeParameter(
            "string",
            resData.slice(10)
          );
        } catch (_) {
          return undefined;
        }
      }
    } else if (isString && res.result.includes(errorStringHash)) {
      try {
        return web3.eth.abi.decodeParameter("string", res.result.slice(10));
      } catch (_) {
        return undefined;
      }
    }
  },

  /**
   * Runs tx via `eth_call` and resolves a reason string if it exists on the response.
   * @param  {Object} web3
   * @param  {Object} interfaceAdapter
   * @return {String|Undefined}
   */
  get: function(params, web3, interfaceAdapter) {
    const packet = {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [params, "latest"],
      id: new Date().getTime()
    };

    return new Promise(resolve => {
      web3.currentProvider.send(packet, (err, response) => {
        const reasonString = reason._extract(response, web3, interfaceAdapter);
        resolve(reasonString);
      });
    });
  }
};

module.exports = reason;
