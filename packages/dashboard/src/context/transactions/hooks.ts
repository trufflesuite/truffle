import { useCallback } from "react";
import { ChainId } from "src/constants/ChainId";
import { sendToast } from "src/context/popups/functions";
import { useTransactionStore } from "src/context/transactions/context";
import {
  TransactionDetails,
  TransactionState
} from "src/context/transactions/types";
import { useAccount, useNetwork } from "wagmi";

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

export function useProviderResponseAdder(): (
  method: string,
  payload: any
) => void {
  const { dispatch } = useTransactionStore();
  const [{ data: networkData }] = useNetwork();
  const [{ data: accountData }] = useAccount();
  return useCallback(
    (method: string, payload: any) => {
      console.log("parsing response tx: ", { method, payload });
      // return early if we aren't connected properly.
      if (!networkData.chain?.id || !accountData) {
        return;
      }

      if (method === "eth_sendTransaction" && payload) {
        // we need to dispatch this...
        if (payload.error) {
          console.error("Got an error:", { error: payload.error });
        } else if (payload.result) {
          // dispatch txHash - from RPC result.
          console.log("Got an result", { result: payload.result });
          dispatch({
            type: "ADD",
            hash: payload.result,
            from: accountData.address,
            chainId: networkData.chain?.id
          });
          // push toast
          sendToast(payload.result);
        }
      } // else ignore.
    },
    [dispatch, networkData, accountData]
  );
}
