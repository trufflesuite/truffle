module.exports = {
  // See <http://trufflesuite.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      url: "ws://127.0.0.1:8545",
      network_id: "*",
      gas: 4700000,
      gasPrice: 20000000000
    }
  }
};
