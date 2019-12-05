import { Block as EvmBlock } from "web3-eth";
import {
  Transaction as EvmTransaction,
  TransactionReceipt as EvmTransactionReceipt
} from "web3-core";

export type NetworkId = number | string;
export type Block = EvmBlock | any;
export type BlockType = number | string;
export type Transaction = EvmTransaction | any;
export type TransactionReceipt = EvmTransactionReceipt | any;
export type TxHash = string;
