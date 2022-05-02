const num = Math.random();
module.exports = {
  networks: {
    develop: {
      provider: () => num,
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
