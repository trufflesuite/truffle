import { Block as EvmBlock } from "web3-eth";
import {
  Transaction as EvmTransaction,
  TransactionReceipt as EvmTransactionReceipt,
  TransactionConfig as EvmTransactionConfig
} from "web3-core";
import { Provider } from "@truffle/provider";
import Config from "@truffle/config";

export type NetworkId = number | string;
export type Block = EvmBlock | any;
export type BlockType = number | string;
export type Transaction = EvmTransaction | any;
export type TransactionReceipt = EvmTransactionReceipt | any;
export type TransactionConfig = EvmTransactionConfig | any;
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
  estimateGas(transactionConfig: TransactionConfig): Promise<number>;
  setProvider(provider: Provider): void;
}
