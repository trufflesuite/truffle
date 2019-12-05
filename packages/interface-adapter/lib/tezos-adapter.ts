import { Web3Shim, Web3ShimOptions } from "./web3-shim";
import { BlockType } from "./interface-adapter/types";

export interface TezosAdapterOptions extends Web3ShimOptions {}

export class TezosAdapter {
  public web3: Web3Shim;
  constructor(options?: TezosAdapterOptions) {
    this.web3 = new Web3Shim(options);
  }

  public getNetworkId() {
    return this.web3.eth.net.getId();
  }

  public getBlock(block: BlockType) {
    return this.web3.eth.getBlock(block);
  }

  public setProvider(provider: any) {
    return this.web3.setProvider(provider);
  }

  public getTransaction(tx: string) {
    return this.web3.eth.getTransaction(tx);
  }

  public getTransactionReceipt(tx: string) {
    return this.web3.eth.getTransactionReceipt(tx);
  }

  public getBalance(address: string) {
    return this.web3.eth.getBalance(address);
  }
}
