const path = require("path");

module.exports = {
  networks: {
    network1: {
      host: "localhost",
      port: "8545",
      network_id: "*"
    },
    network2: {
      host: "localhost",
      port: "9545",
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "0.8.0"
    }
  },
  db: {
    enabled: true,
    adapter: {
      name: "indexeddb",
      settings: {
        directory: path.join(__dirname, ".db")
      }
    }
  }
};
