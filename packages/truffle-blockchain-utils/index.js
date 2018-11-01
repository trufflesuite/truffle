const Config = require("truffle-config");
const BlockchainUtils = require("./lib/");

let config = Config.search();
let Blockchain;

if (config) {
  config = Config.detect();
  config.blockchainUtils
    ? (Blockchain = config.blockchainUtils)
    : (Blockchain = BlockchainUtils);
} else {
  Blockchain = BlockchainUtils;
}

module.exports = Blockchain;
