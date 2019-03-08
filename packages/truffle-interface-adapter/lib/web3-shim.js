const Web3 = require("web3");
const BN = require("bn.js");

// This is a temporary shim to support the basic issues with Quorum

class Web3Shim extends Web3 {
  constructor(options) {
    super();

    this.networkType = options.networkType || "ethereum";

    if (options.provider) {
      this.initProvider(options.provider);
    }

    this.initInterface();
  }

  setNetworkType(networkType) {
    this.networkType = networkType;
    this.initInterface();
  }

  initInterface() {
    switch (this.networkType) {
      case "quorum": {
        this.initQuorum();
        break;
      }
      case "ethereum":
      default: {
        break;
      }
    }
  }

  initQuorum() {
    // duck punch the block output formatter since quorum uses nanoseconds in the timestamp
    // field instead of seconds
    const _oldFormatter = this.eth.getBlock.method.outputFormatter;
    this.eth.getBlock.method.outputFormatter = block => {
      const _oldTimestamp = block.timestamp;
      let timestamp = new BN(block.timestamp.slice(2), 16);
      timestamp = timestamp.div(new BN(10).pow(new BN(9)));
      block.timestamp = "0x" + timestamp.toString(16);
      let result = _oldFormatter.call(this.eth.getBlock.method, block);
      result.timestamp = _oldTimestamp;
      return result;
    };
  }
}

module.exports = Web3Shim;
