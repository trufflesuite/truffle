import type { Transaction, TransactionReceipt } from "web3-core";
import Web3 from "web3";

import type TruffleConfig from "@truffle/config";

interface FetchTransactionInfoOptions {
  config: TruffleConfig;
  transactionHash: string;
}

export async function fetchTransactionInfo({
  config,
  transactionHash
}: FetchTransactionInfoOptions): Promise<{
  transaction: Transaction;
  receipt: TransactionReceipt;
  addresses: string[];
  error: any;
}> {
  const web3 = new Web3(config.provider);
  let transaction;
  let receipt;
  let addresses: string[] = [];
  let error;

  try {
    transaction = await web3.eth.getTransaction(transactionHash);
    receipt = await web3.eth.getTransactionReceipt(transactionHash);
  } catch (e) {
    error = e.message;
  }

  // include direct `to`
  if (transaction?.to) {
    addresses.push(transaction.to);
  }

  // or the created contract address for create transactions
  if (receipt?.contractAddress) {
    addresses.push(receipt.contractAddress);
  }

  // and include anything mentioned in receipt logs
  for (const { address } of receipt?.logs) {
    addresses.push(address);
  }

  // filter for uniqueness
  const set = new Set(addresses);
  addresses = Array.from(set);

  return {
    transaction,
    receipt,
    addresses,
    error
  };
}
