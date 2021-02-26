import { useState, useEffect } from "react";
import type { Transaction, TransactionReceipt } from "web3-core";
import Web3 from "web3";

import type TruffleConfig from "@truffle/config";

export interface UseTransactionInfoOptions {
  config: TruffleConfig;
  transactionHash: string | undefined;
}

export function useTransactionInfo({
  config,
  transactionHash
}: UseTransactionInfoOptions): {
  transaction: Transaction | undefined;
  receipt: TransactionReceipt | undefined;
  addresses: string[] | undefined;
} {
  const [transaction, setTransaction] = useState<Transaction | undefined>();
  const [receipt, setReceipt] = useState<TransactionReceipt | undefined>();
  const [addresses, setAddresses] = useState<string[] | undefined>();

  useEffect(() => {
    if (!transactionHash) {
      return;
    }

    const { transaction, receipt, addresses } = fetchTransactionInfo({
      config,
      transactionHash
    });

    transaction.then(setTransaction);
    receipt.then(setReceipt);
    addresses.then(setAddresses);
  }, [transactionHash]);

  return {
    transaction,
    receipt,
    addresses
  };
}

interface FetchTransactionInfoOptions {
  config: TruffleConfig;
  transactionHash: string;
}

function fetchTransactionInfo({
  config,
  transactionHash
}: FetchTransactionInfoOptions): {
  transaction: Promise<Transaction>;
  receipt: Promise<TransactionReceipt>;
  addresses: Promise<string[]>;
} {
  const web3 = new Web3(config.provider);

  const transaction = web3.eth.getTransaction(transactionHash);
  const receipt = web3.eth.getTransactionReceipt(transactionHash);

  const addresses = Promise.all([transaction, receipt]).then(
    ([transaction, receipt]) => {
      const addresses: string[] = [];

      // include direct `to`
      if (transaction.to) {
        addresses.push(transaction.to);
      }

      // or the created contract address for create transactions
      if (receipt.contractAddress) {
        addresses.push(receipt.contractAddress);
      }

      // and include anything mentioned in receipt logs
      for (const { address } of receipt.logs) {
        addresses.push(address);
      }

      // filter for uniqueness
      return addresses.filter(
        (address, index, self) => self.indexOf(address) === index
      );
    }
  );

  return {
    transaction,
    receipt,
    addresses
  };
}
