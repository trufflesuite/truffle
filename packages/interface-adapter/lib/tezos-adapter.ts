import { Web3Shim, Web3ShimOptions } from "./web3-shim";

export interface TezosAdapterOptions extends Web3ShimOptions {}

export class TezosAdapter extends Web3Shim {
  constructor(options?: TezosAdapterOptions) {
    super(options);
  }
  public getNetworkId() {
    return this.eth.net.getId();
  }
}
