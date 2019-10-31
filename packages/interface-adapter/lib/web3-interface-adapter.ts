import { Web3Shim, Web3ShimOptions } from "./web3-shim";
import { BlockType } from "web3/eth/types";

export interface Web3InterfaceAdapterOptions extends Web3ShimOptions {}

export class Web3InterfaceAdapter extends Web3Shim {
  constructor(options?: Web3InterfaceAdapterOptions) {
    super(options);
  }

  public getNetworkId() {
    return this.eth.net.getId();
  }

  public getBlock(block: BlockType) {
    return this.eth.getBlock(block);
  }
}
