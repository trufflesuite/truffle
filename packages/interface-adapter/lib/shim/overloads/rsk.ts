import { Web3Shim } from "..";

export const RskDefinition = {
  async initNetworkType(web3: Web3Shim) {
    overrides.getSymbol();    
  }
};

const overrides = {
  getSymbol: () => {
    return "R-BTC";
  }
}