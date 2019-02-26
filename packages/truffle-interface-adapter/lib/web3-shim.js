const Web3 = require("web3");
const BN = require("bn.js");

// This is a temporary shim to support the basic issues with Quorum

class Web3Shim {
  constructor(options) {
    let web3 = new Web3();
    web3.setProvider(options.provider);

    if (options.quorum) {
      // duck punch the block output formatter since quorum uses nanoseconds in the timestamp
      // field instead of seconds
      const _oldFormatter = web3.eth.getBlock.method.outputFormatter;
      web3.eth.getBlock.method.outputFormatter = block => {
        const _oldTimestamp = block.timestamp;
        let timestamp = new BN(block.timestamp.slice(2), 16);
        timestamp = timestamp.div(new BN(10).pow(new BN(9)));
        block.timestamp = "0x" + timestamp.toString(16);
        let result = _oldFormatter.call(web3.eth.getBlock.method, block);
        result.timestamp = _oldTimestamp;
        return result;
      };
    }

    return web3;
  }
}

module.exports = Web3Shim;
