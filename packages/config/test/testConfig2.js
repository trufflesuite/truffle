const bip39 = require("bip39");
const mnemonic = bip39.entropyToMnemonic("00000000000000000000000000000000");
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    develop: {
      provider: function () {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/");
      },
      host: "127.0.0.1", // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: "*" // Any network (default: none)
    },

    compilers: {
      solc: {
        version: "0.8.12" // Fetch exact version from solc-bin (default: truffle's version)
      }
    }
  }
};
