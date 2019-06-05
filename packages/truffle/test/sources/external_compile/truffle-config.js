module.exports = {
  compilers: {
    external: {
      command: "./compile-external",
      targets: [
        {
          path: "external/M*.json", // MetaCoin and Migrations
          command: "cat -"
        },
        {
          path: "external/ConvertLib.json",
          command: "cat",
          stdin: false
        },
        {
          properties: {
            contractName: "ExtraMetaCoin"
          },
          fileProperties: {
            abi: "external/MetaCoin.abi",
            bytecode: "external/MetaCoin.bytecode"
          }
        }
      ]
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 4700000,
      gasPrice: 20000000000
    }
  }
};
