import { Web3Shim } from "../../shim";
import {
  InterfaceAdapter,
  EvmBlockType,
  Provider,
  Transaction
} from "../types";

export interface Web3InterfaceAdapterOptions {
  provider?: Provider;
  networkType?: string;
}

export class Web3InterfaceAdapter implements InterfaceAdapter {
  public web3: Web3Shim;

  constructor({ provider, networkType }: Web3InterfaceAdapterOptions = {}) {
    this.web3 = new Web3Shim({ provider, networkType });
  }

  public getNetworkId() {
    return this.web3.eth.net.getId();
  }

  public getBlock(block: EvmBlockType) {
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

  public getAccounts() {
    return this.web3.eth.getAccounts();
  }

  public estimateGas(transactionConfig: Transaction) {
    return this.web3.eth.estimateGas(transactionConfig);
  }

  public getBlockNumber() {
    return this.web3.eth.getBlockNumber();
  }
}
