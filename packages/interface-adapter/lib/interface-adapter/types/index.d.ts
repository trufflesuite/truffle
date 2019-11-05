import { Block as EvmBlock } from "web3/eth/types";
import { BlockType as EvmBlockType } from "web3/eth/types";
import { Transaction as EvmTransaction } from "web3/eth/types";

export type NetworkId = Number | String;
export type Block = EvmBlock | any;
export type BlockType = EvmBlockType | any;
export type Transaction = EvmTransaction | any;
export type TxHash = string;
