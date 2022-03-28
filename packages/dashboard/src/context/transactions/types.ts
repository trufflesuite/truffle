import { ChainId } from "src/constants/ChainId";

export interface SerializableTransactionReceipt {
  to: string;
  from: string;
  contractAddress: string;
  transactionIndex: number;
  blockHash: string;
  transactionHash: string;
  blockNumber: number;
  status?: number;
}

export interface TransactionDetails {
  hash: string;
  summary?: string;
  receipt?: SerializableTransactionReceipt;
  lastCheckedBlockNumber?: number;
  addedTime: number;
  confirmedTime?: number;
  from: string;
}

type txHash = string;

export type TransactionState = {
  [key in ChainId]?: Record<txHash, TransactionDetails>;
};
