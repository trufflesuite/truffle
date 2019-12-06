import { Web3Shim } from "../../shim";
import { InterfaceAdapter, BlockType } from "../types";
import { Provider } from "@truffle/provider";
import Config from "@truffle/config";

export interface TezosAdapterOptions {
  config?: Config;
  provider?: Provider;
  networkType?: string;
}

export class TezosAdapter implements InterfaceAdapter {
  public web3: Web3Shim;
  constructor({ config, provider, networkType }: TezosAdapterOptions = {}) {
    this.web3 = new Web3Shim({ config, provider, networkType });
  }

  public getNetworkId() {
    return this.web3.eth.net.getId();
  }

  public getBlock(block: BlockType) {
    return this.web3.eth.getBlock(block);
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

  public getCode(address: string) {
    return this.web3.eth.getCode(address);
  }

  public getAccounts(config: any) {
    return this.web3.eth.getAccounts(config);
  }

  public estimateGas(transactionConfig: any) {
    return this.web3.eth.estimateGas(transactionConfig);
  }

  public getBlockNumber() {
    return this.web3.eth.getBlockNumber();
  }

  public setProvider(provider: Provider) {
    return this.web3.setProvider(provider);
  }
}
