import { Web3Shim, Web3ShimOptions } from "./web3-shim";

export interface InterfaceAdapterOptions extends Web3ShimOptions {}


const supportedEvmNetworks = ["ethereum", "fabric-evm", "quorum"];

const getNetworkTypeClass = ({
  networkType = "ethereum"
}: InterfaceAdapterOptions) => {
  if (supportedEvmNetworks.includes(networkType)) return "evm-like";
  return networkType;
};

export class InterfaceAdapter {
  /* ... */
  constructor (networkType) {
    switch(getNetworkTypeClass(networkType)) {
      case "evm-like":
        // use web3 shim
      case "tezos":
        // use taquito
    }
  }

  getNetworkId() {
    return ...
  }
}
