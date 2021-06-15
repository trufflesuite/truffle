import BN from "bn.js";
import { Web3Shim } from "../../shim";
import type {
  InterfaceAdapter,
  EvmBlockType,
  Provider,
  Transaction,
  TransactionReceipt,
  TransactionCostReport
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

  public async getTransactionCostReport(receipt: TransactionReceipt): Promise<TransactionCostReport> {
    const tx = await this.getTransaction(receipt.transactionHash);
    const block = await this.getBlock(receipt.blockNumber);

    if (!block) return null;

    const balance = await this.getBalance(tx.from);
    const gasPrice = new BN(tx.gasPrice);
    const gas = new BN(receipt.gasUsed);
    const value = new BN(tx.value);
    const cost = gasPrice.mul(gas).add(value);

    return {
      timestamp: block.timestamp,
      from: tx.from,
      balance: Web3Shim.utils.fromWei(balance, "ether"),
      gasUnit: "gwei",
      gasPrice: Web3Shim.utils.fromWei(gasPrice, "gwei"),
      gas,
      valueUnit: "ETH",
      value: Web3Shim.utils.fromWei(value, "ether"),
      cost
    };
  }

  public displayCost(value: BN) {
    return Web3Shim.utils.fromWei(value, "ether");
  }
}
