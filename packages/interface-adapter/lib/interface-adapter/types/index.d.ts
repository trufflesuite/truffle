import { Block as EvmBlock } from "web3-eth";
import {
  Transaction as EvmTransaction,
  TransactionReceipt as EvmTransactionReceipt
} from "web3-core";

export type EvmBlockType = number | string;
export type NetworkId = Number | String;
export type Block = EvmBlock | any;
export type BlockType = EvmBlockType | any;
export type Transaction = EvmTransaction | any;
export type TransactionReceipt = EvmTransactionReceipt | any;
export type TxHash = string;
