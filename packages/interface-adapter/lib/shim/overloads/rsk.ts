import { Web3Shim } from "..";

// We simply return plain ol' Web3.js because at least for now we don't have to override.
export const RskDefinition = {
  async initNetworkType(web3: Web3Shim) {}
};

//Add minimun gas price!