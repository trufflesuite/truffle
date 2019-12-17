import {
  Block as EvmBlock,
  BlockType as EvmBlockType,
  Tx as EvmTransaction
} from "web3/eth/types";
import { TransactionReceipt as EvmTransactionReceipt } from "web3/types";
import { Provider } from "web3/providers";
import Config from "@truffle/config";

export type EvmTransactionReceipt = EvmTransactionReceipt;
export type EvmTransaction = EvmTransaction;
export type Provider = Provider;
export type EvmBlockType = EvmBlockType;
export type Config = Config;
export type NetworkId = number | string;
export type Block = EvmBlock | any;
export type BlockType = number | string;
export type Transaction = EvmTransaction | any;
export type TransactionReceipt = EvmTransactionReceipt | any;
export type TxHash = string;

export interface InterfaceAdapter {
  getNetworkId(): Promise<NetworkId>;
  getBlock(block: BlockType): Promise<Block>;
  getBlockNumber(): Promise<number>;
  getTransaction(tx: TxHash): Promise<Transaction>;
  getTransactionReceipt(tx: TxHash): Promise<TransactionReceipt>;
  getBalance(address: string): Promise<string>;
  getCode(address: string): Promise<string>;
  getAccounts(config?: Config): Promise<string[]>;
  estimateGas(transactionConfig: Transaction): Promise<number>;
  setProvider(provider: Provider): void;
}
