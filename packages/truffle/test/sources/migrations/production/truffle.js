module.exports = {
  networks: {
    ropsten: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 4700000,
      gasPrice: 20000000000,
      confirmations: (process.env.GETH) ? 0 : 2,
      production: true,
      timeoutBlocks: 70,
    },
    fakeRopsten: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 4700000,
      gasPrice: 20000000000,
      confirmations: (process.env.GETH) ? 0 : 2,
      production: true,
      timeoutBlocks: 70,
      skipDryRun: true
    }
  },
};
