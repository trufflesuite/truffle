module.exports = {
  ethpm: {
    ipfsHost: "ipfs.infura.io",
    ipfsProtocol: "https",
    ipfsPort: "5001",
    version: "3",
    registry: {
      address: "0x0bd0200357D26A0bB5d1D1c1Fd56C317B68d15d5",
      network: "ropsten"
    }
  },
  networks: {
    ropsten: {
      provider: "",
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 4700000,
      gasPrice: 20000000000
    }
  }
};
