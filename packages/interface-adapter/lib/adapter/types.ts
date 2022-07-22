import type BN from "bn.js";
import type {
  Block as EvmBlock,
  BlockType as EvmBlockType,
  Tx as EvmTransaction
} from "web3/eth/types";
import type { TransactionReceipt as EvmTransactionReceipt } from "web3-eth/types";

export {
  Block as EvmBlock,
  BlockType as EvmBlockType,
  Tx as EvmTransaction
} from "web3/eth/types";
export { TransactionReceipt as EvmTransactionReceipt } from "web3-eth/types";
export { provider as Provider } from "web3-core/types";
export type NetworkId = Number | String;
export type Block = EvmBlock | any;
export type BlockType = EvmBlockType | any;
export type Transaction = EvmTransaction | any;
export type TransactionReceipt = EvmTransactionReceipt | any;
export type TxHash = string;
export type TransactionCostReport = {
  timestamp: number;
  from: string;
  balance: string;
  gasUnit: string;
  gasPrice: string;
  gas: BN;
  valueUnit: string;
  value: string;
  cost: BN;
};

export interface InterfaceAdapter {
  getNetworkId(): Promise<NetworkId>;
  getBlock(block: BlockType): Promise<Block>;
  getBlockNumber(): Promise<number>;
  getTransaction(tx: TxHash): Promise<Transaction>;
  getTransactionReceipt(tx: TxHash): Promise<TransactionReceipt>;
  getBalance(address: string): Promise<string>;
  getCode(address: string): Promise<string>;
  getAccounts(): Promise<string[]>;
  estimateGas(
    transactionConfig: Transaction,
    stacktrace: boolean
  ): Promise<number> | null;
  getTransactionCostReport(
    receipt: TransactionReceipt
  ): Promise<TransactionCostReport>;
  displayCost(value: BN): string;
}
