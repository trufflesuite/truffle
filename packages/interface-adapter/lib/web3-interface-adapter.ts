import { Web3Shim, Web3ShimOptions } from "./web3-shim";
import { Provider } from "@truffle/provider";
import {
  EvmBlockType,
  Transaction,
  TransactionReceipt,
  Block
} from "./interface-adapter/types";

export interface Web3InterfaceAdapterOptions extends Web3ShimOptions {}

export class Web3InterfaceAdapter {
  public web3: Web3Shim;

  constructor(options?: Web3InterfaceAdapterOptions) {
    this.web3 = new Web3Shim(options);
  }

  public async getNetworkId(): Promise<number> {
    return this.web3.eth.net.getId();
  }

  public async getBlock(block: EvmBlockType): Promise<Block> {
    return this.web3.eth.getBlock(block);
  }

  public setProvider(provider: Provider): boolean {
    return this.web3.setProvider(provider);
  }

  public async getTransaction(tx: string): Promise<Transaction> {
    return this.web3.eth.getTransaction(tx);
  }

  public async getTransactionReceipt(tx: string): Promise<TransactionReceipt> {
    return this.web3.eth.getTransactionReceipt(tx);
  }

  public async getBalance(address: string): Promise<string> {
    return this.web3.eth.getBalance(address);
  }
}
