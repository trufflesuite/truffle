module.exports = {
  // See <http://trufflesuite.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: 5000,
      network_id: "*",
      type: "fabric-evm"
    }
  }
};
