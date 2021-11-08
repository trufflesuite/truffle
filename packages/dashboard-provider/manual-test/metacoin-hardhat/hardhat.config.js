require("@nomiclabs/hardhat-waffle");
require("@tenderly/hardhat-tenderly");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");

module.exports = {
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://localhost:8545"
    },
    browser: {
      url: "http://localhost:5000/rpc"
    }
  },
  namedAccounts: {
    deployer: {
      default: 0 // here this will by default take the first account as deployer
    }
  }
};
