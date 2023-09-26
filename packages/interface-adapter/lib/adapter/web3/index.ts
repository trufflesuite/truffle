import BN from "bn.js";
import { FMT_NUMBER, FMT_BYTES } from "web3-types";
import { Web3Shim } from "../../shim";
import type {
  InterfaceAdapter,
  EvmBlockType,
  Provider,
  Transaction,
  TransactionReceipt,
  TransactionCostReport
} from "../types";

export const NUMBER_FORMAT = {
  number: FMT_NUMBER.NUMBER,
  bytes: FMT_BYTES.HEX
} as const;

export const STR_NUMBER_FORMAT = {
  number: FMT_NUMBER.STR,
  bytes: FMT_BYTES.HEX
} as const;

export const HEX_STR_NUMBER_FORMAT = {
  number: FMT_NUMBER.HEX,
  bytes: FMT_BYTES.HEX
} as const;

export interface Web3InterfaceAdapterOptions {
  provider?: Provider;
  networkType?: string;
}

export class Web3InterfaceAdapter implements InterfaceAdapter {
  public web3: Web3Shim;
  public networkType: string;

  constructor({ provider, networkType }: Web3InterfaceAdapterOptions = {}) {
    this.web3 = new Web3Shim({ provider, networkType });
    this.networkType = networkType;
  }

  public getNetworkId() {
    if (this.networkType === "fabric-evm") {
      return this.web3.eth.net.getId(STR_NUMBER_FORMAT);
    }

    return this.web3.eth.net.getId(NUMBER_FORMAT);
  }

  public getBlock(block: EvmBlockType) {
    if (this.networkType === "quorum") {
      return this.web3.eth.getBlock(block, false, HEX_STR_NUMBER_FORMAT);
    }
    return this.web3.eth.getBlock(block, false, NUMBER_FORMAT);
  }

  public getTransaction(tx: string) {
    return this.web3.eth.getTransaction(tx, NUMBER_FORMAT);
  }

  public getTransactionReceipt(tx: string) {
    return this.web3.eth.getTransactionReceipt(tx, NUMBER_FORMAT);
  }

  public getBalance(address: string) {
    return this.web3.eth.getBalance(address, "latest", STR_NUMBER_FORMAT);
  }

  public getCode(address: string) {
    return this.web3.eth.getCode(address);
  }

  public getAccounts() {
    return this.web3.eth.getAccounts();
  }

  public async estimateGas(transactionConfig: Transaction, stacktrace = false) {
    // web3 does not error gracefully when gas estimation fails due to a revert,
    // so in cases where we want to get past this (debugging/stacktracing), we must
    // catch the error and return null instead
    if (stacktrace === true) {
      try {
        const gasEstimate = await this.web3.eth.estimateGas(
          transactionConfig,
          "latest",
          NUMBER_FORMAT
        );
        return gasEstimate;
      } catch {
        return null;
      }
    } else {
      return this.web3.eth.estimateGas(
        transactionConfig,
        "latest",
        NUMBER_FORMAT
      );
    }
  }

  public getBlockNumber() {
    return this.web3.eth.getBlockNumber().then(bn => Number(bn));
  }

  public async getTransactionCostReport(
    receipt: TransactionReceipt
  ): Promise<TransactionCostReport> {
    const tx = await this.getTransaction(receipt.transactionHash);
    const block = await this.getBlock(receipt.blockNumber);

    if (!block) return null;

    const balance = await this.getBalance(tx.from);
    // TODO: `gasPrice` does not exists in the specs so need to debug and fix it.
    // https://github.com/ChainSafe/web3.js/issues/5232
    const gasPrice = new BN((tx as any).gasPrice);
    const gas = new BN(receipt.gasUsed);
    const value = new BN(String(tx.value));
    const cost = gasPrice.mul(gas).add(value);
    //todo web3, why this is not used?
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const timestamp =
      typeof block.timestamp === "string"
        ? parseInt(block.timestamp)
        : block.timestamp;

    return {
      timestamp: Number(block.timestamp),
      from: tx.from,
      balance: Web3Shim.utils.fromWei(balance, "ether"),
      gasUnit: "gwei",
      gasPrice: Web3Shim.utils.fromWei(gasPrice.toString(), "gwei"),
      gas,
      valueUnit: "ETH",
      value: Web3Shim.utils.fromWei(value.toString(), "ether"),
      cost
    };
  }

  public displayCost(value: BN) {
    return Web3Shim.utils.fromWei(value.toString(), "ether");
  }
}
