module.exports = {
  solidityLog: {
    displayPrefix: ": ",
    preventConsoleLogMigration: true
  },

  networks: {
    mainnet: {
      network_id: 1,
      host: "127.0.0.1",
      port: 7545
    }
  },

  compilers: {
    solc: {
      version: "0.8.13" // Fetch exact version from solc-bin (default: truffle's version)
    }
  }
};
