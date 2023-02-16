const DebugUtils = require("@truffle/debug-utils");

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
  _extract: function (res, web3, _interfaceAdapter) {
    //I'm not sure why interfaceAdapter is here if it's not used,
    //so I just put an underscore in front of its name for now...
    if (!res || (!res.error && !res.result)) return;

    const isObject =
      res && typeof res === "object" && res.error && res.error.data;
    const isString =
      res && typeof res === "object" && typeof res.result === "string";

    if (isObject) {
      // NOTE that Ganache >=2 returns the reason string when
      // vmErrorsOnRPCResponse === true, which this code could
      // be updated to respect (instead of computing here)
      const data = res.error.data;
      let resData;
      if (typeof data === "string") {
        resData = data; // geth, Ganache >7.0.0
      } else if ("result" in data) {
        // there is a single result (Ganache 7.0.0)
        resData = data.result;
      } else {
        // handle `evm_mine`, `miner_start`, batch payloads, and ganache 2.0
        // NOTE this only works for a single failed transaction at a time.
        const hash = Object.keys(data)[0];
        const errorDetails = data[hash];
        resData = errorDetails.return /* ganache 2.0 */;
      }

      return reason._decode(resData, web3);
    } else if (isString) {
      return reason._decode(res.result, web3);
    } else {
      return undefined;
    }
  },

  _decode: function (rawData, web3) {
    const errorStringHash = "0x08c379a0";
    const panicCodeHash = "0x4e487b71";
    const selectorLength = 2 + 2 * 4; //0x then 4 bytes (0x then 8 hex digits)
    const wordLength = 2 * 32; //32 bytes (64 hex digits)
    if (!rawData) {
      return undefined;
    } else if (rawData === "0x") {
      //no revert message
      return undefined;
    } else if (rawData.startsWith(errorStringHash)) {
      try {
        return web3.eth.abi.decodeParameter(
          "string",
          rawData.slice(selectorLength)
        );
      } catch (_) {
        //no reasonable way to handle this case at present
        return undefined;
      }
    } else if (rawData.startsWith(panicCodeHash)) {
      if (rawData.length === selectorLength + wordLength) {
        const panicCode = web3.eth.abi.decodeParameter(
          "uint256",
          rawData.slice(selectorLength)
        ); //this returns a decimal string
        return `Panic: ${DebugUtils.panicString(panicCode)}`;
      } else {
        //incorrectly encoded panic...?
        return undefined;
      }
    } else {
      const bytesLength = (rawData.length - 2) / 2; //length of raw data in bytes
      if (bytesLength % 32 === 4) {
        //we can't reasonably handle custom errors here at present, sorry
        return "Custom error (could not decode)";
      } else {
        //if the length isn't 4 mod 32, just give up and return undefined.
        //the reason for this is that sometimes this function can accidentally get
        //called on a return value rather than an error (because the tx ran out of
        //gas or failed for a reason other than a revert, e.g., getting refused by
        //the user in MetaMask), meaning the eth_call rerun will *succeed*, potentially
        //resulting in a return value.  We don't want to attach an additional
        //error message in that case, so we return undefined.
        //(What if e.g. the tx is refused by the user in MetaMask, but the rerun yields
        //a revert string...?  Well, that's a problem for another time...)
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
  get: function (params, web3, interfaceAdapter) {
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
