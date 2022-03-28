import { useCallback } from "react";
import { ChainId } from "src/constants/ChainId";
import { useTransactionStore } from "src/context/transactions/context";
import {
  TransactionDetails,
  TransactionState
} from "src/context/transactions/types";
import { useNetwork } from "wagmi";

export const useTransactions = (): TransactionState => {
  return {};
};

export type TransactionWrapper = {
  chainId: ChainId;
  hash: string;
  from: string;
  approval?: { tokenAddress: string; spender: string };
  claim?: { recipient: string };
  summary?: string;
};

export function useTransactionAdder(): (tx: TransactionWrapper) => void {
  const { state, dispatch } = useTransactionStore();
  return useCallback<(tx: TransactionWrapper) => void>(
    tx => {
      console.log("creating tx: ", { tx, state });
      dispatch({
        type: "ADD",
        hash: tx.hash,
        from: tx.from,
        chainId: tx.chainId
      });
    },
    [dispatch, state]
  );
}

// returns all the transactions for the current chain
export function useAllTransactions(): { [txHash: string]: TransactionDetails } {
  const [{ data }] = useNetwork();
  const { state } = useTransactionStore();
  return data.chain?.id ? state[data.chain.id as ChainId] ?? {} : {};
}

/**
 * Returns whether a transaction happened in the last day (86400 seconds * 1000 milliseconds / second)
 * @param tx to check for recency
 */
export function isTransactionRecent(tx: TransactionDetails): boolean {
  return new Date().getTime() - tx.addedTime < 86_400_000;
}
