import { Web3Shim, Web3ShimOptions } from "./web3-shim";

export interface InterfaceAdapterOptions extends Web3ShimOptions {}




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
