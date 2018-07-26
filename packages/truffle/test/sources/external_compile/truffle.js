module.exports = {
  compilers: {
    external: {
      command: "truffle compile " +
        "--compiler=solc " +
        "--contracts_build_directory=external",
      targets: [{
        path: "external/*.json"
      }]
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: '*',
      gas: 4700000,
      gasPrice: 20000000000,
    },
  },
};
