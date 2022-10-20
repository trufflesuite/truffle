const Ganache = require("ganache");

const provider = Ganache.provider({
  // note instamine must be set to eager (default) with vmErrorsOnRPCResponse enabled
  vmErrorsOnRPCResponse: true,
  logging: {
    quiet: true
  }
});

module.exports = {
  networks: {
    development: {
      provider,
      network_id: "*"
    },
    test: {
      provider,
      network_id: "*"
    }
  },
  compilers: {
    solc: {
      version: "0.8.0"
    }
  }
};
