import { HardhatUserConfig } from "hardhat/config";

require("@nomiclabs/hardhat-ethers");

import "../../../src/index";

const config: HardhatUserConfig = {
  networks: {
    dashboard: {
      url: "http://localhost:24012/rpc"
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.8.17"
      }
    ]
  }
};

export default config;
