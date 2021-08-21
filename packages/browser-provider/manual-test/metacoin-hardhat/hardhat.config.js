require("@nomiclabs/hardhat-waffle");
require("@tenderly/hardhat-tenderly");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");

module.exports = {
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://localhost:8545",
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
  },
};
