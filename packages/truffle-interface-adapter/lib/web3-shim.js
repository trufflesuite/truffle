const Web3 = require("web3");
const BN = require("bn.js");

// March 13, 2019 - Mike Seese:
// This is a temporary shim to support the basic, Ethereum-based
// multiledger integration. This whole adapter, including this shim,
// will undergo better architecture before TruffleCon to support
// other non-Ethereum-based ledgers.

class Web3Shim extends Web3 {
  constructor(options) {
    super();

    if (options) {
      this.networkType = options.networkType || "ethereum";

      if (options.provider) {
        this.setProvider(options.provider);
      }
    } else {
      this.networkType = "ethereum";
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
