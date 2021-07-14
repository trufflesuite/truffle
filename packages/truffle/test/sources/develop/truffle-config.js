module.exports = {
  networks: {
    local: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 4700000,
      gasPrice: 20000000000
    }
  },
  console: {
    require: [
      { path: "./snippets/helper.js" }
    ]
  }
};
