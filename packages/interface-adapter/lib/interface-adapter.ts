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
