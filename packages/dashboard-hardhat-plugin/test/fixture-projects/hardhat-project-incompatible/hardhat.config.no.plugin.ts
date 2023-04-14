import { HardhatUserConfig } from "hardhat/config";

require("@nomiclabs/hardhat-ethers");

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17"
      }
    ]
  }
};

export default config;
