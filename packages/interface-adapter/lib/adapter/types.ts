import type BN from "bn.js";
import type {
  Block as EvmBlock,
  TransactionInfo as EvmTransaction,
  BlockTags as EvmBlockType,
  TransactionReceipt as EvmTransactionReceipt
} from "web3-types";
export {
  Block as EvmBlock,
  TransactionInfo as EvmTransaction,
  Web3BaseProvider as Provider,
  BlockTags as EvmBlockType,
  TransactionReceipt as EvmTransactionReceipt,
  Web3BaseProvider
} from "web3-types";
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
export type Mutable<Type> = {
  -readonly [K in keyof Type]: Type[K];
};
