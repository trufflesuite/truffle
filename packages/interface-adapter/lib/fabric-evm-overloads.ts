import { InterfaceAdapter } from "./interface-adapter";

export const FabricEvmDefinition = {
  async initNetworkType(web3: InterfaceAdapter) {
    // web3 expects getId to return a hexString convertible to a number
    // for fabric-evm we ignore the hexToNumber output formatter
    overrides.getId(web3);
  }
};

const overrides = {
  // The ts-ignores are ignoring the checks that are
  // saying that web3.eth.net.getId is a function and doesn't
  // have a `method` property, which it does
  getId: (web3: InterfaceAdapter) => {
    // @ts-ignore
    const _oldGetIdFormatter = web3.eth.net.getId.method.outputFormatter;
    // @ts-ignore
    web3.eth.net.getId.method.outputFormatter = (hexId: Number | String) => {
      // chaincode-fabric-evm currently returns a "fabric-evm" string
      // instead of a hex networkID. Instead of trying to decode the hexToNumber,
      // let's just accept `fabric-evm` as a valid networkID for now.
      return hexId;
    };

    web3.getNetworkId = web3.eth.net.getId;
  }
};
