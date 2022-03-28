import { useCallback } from "react";
import { ChainId } from "src/constants/ChainId";
import { useTransactionStore } from "src/context/transactions/context";
import { TransactionState } from "src/context/transactions/types";

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
