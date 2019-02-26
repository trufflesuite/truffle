const Web3 = require("web3");

// This is a temporary shim to support the basic issues with Quorum

export default class Web3Shim {
  constructor(options) {
    let web3 = new Web3();
    web3.setProvider(options.provider);

    if (options.legacy) {
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
