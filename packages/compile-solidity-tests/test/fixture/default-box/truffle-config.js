module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 5000000
    }
  },
  compilers: {
    solc: {
      version: "0.6.9",
      settings: {
        optimizer: {
          enabled: false, // Default: false
          runs: 200 // Default: 200
        }
      }
    }
  }
};
