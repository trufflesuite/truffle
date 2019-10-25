module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  compilers: {
    solc: {
      version: "^0.5.7"
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: "8545",
      network_id: "*"
    }
  }
};
