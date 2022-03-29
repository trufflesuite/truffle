import { useCallback, useMemo } from "react";
import { ChainId } from "src/constants/ChainId";
import { sendToast } from "src/context/popups/functions";
import { useTransactionStore } from "src/context/transactions/context";
import {
  TransactionDetails,
  TransactionState
} from "src/context/transactions/types";
import { useAccount, useNetwork, useProvider } from "wagmi";

const FIVE_MINS_MS = 300_000;

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

/**
 * This callback function is used to handle ProviderResponse RPC objects and track the txHashes of eth_sendTransaction calls.
 *
 * Will push to our state object and send toasts for all states in the system.
 *
 */
export function useProviderResponseAdder(): (
  method: string,
  payload: any
) => void {
  const { state, dispatch } = useTransactionStore();
  const [{ data: networkData }] = useNetwork();
  const [{ data: accountData }] = useAccount();
  const provider = useProvider();

  const transactions = useMemo(
    () =>
      networkData.chain?.id
        ? state[networkData.chain?.id as ChainId] ?? {}
        : {},
    [networkData, state]
  );

  return useCallback(
    (method: string, payload: any) => {
      // return early if we aren't connected properly.
      if (!networkData.chain?.id || !accountData) {
        return;
      }
      // only do this on sendTransaction calls.
      if (method === "eth_sendTransaction" && payload) {
        const summary = `TX Sent: ${new Date().toISOString()}`;
        // we need to dispatch this...
        if (payload.error) {
          console.error("Got an error:", { error: payload.error });
        } else if (payload.result) {
          // dispatch txHash - from RPC result.
          // now watch for updates on the tx for 5 minutes.
          provider
            .waitForTransaction(payload.result, 1, FIVE_MINS_MS)
            .then(receipt => {
              console.debug("TX Result: ", { receipt });
              // dispatch finalize
              if (receipt) {
                const hash = receipt.transactionHash;
                const chainId = networkData.chain?.id as ChainId;
                dispatch({
                  type: "FINALIZE",
                  chainId,
                  hash,
                  receipt: {
                    blockHash: receipt.blockHash,
                    blockNumber: receipt.blockNumber,
                    contractAddress: receipt.contractAddress,
                    from: receipt.from,
                    status: receipt.status,
                    to: receipt.to,
                    transactionHash: receipt.transactionHash,
                    transactionIndex: receipt.transactionIndex
                  }
                });
                // let the user know on the UI they got an update.
                sendToast(
                  hash,
                  receipt.status === 1,
                  transactions[hash]?.summary
                );
              }
              // FIXME: We may need to add more data into the receipt object for the decoder to work in the future.
              /* const rcpt = {
                  "to": null,
                  "from": "0x37aD88b4bdAE06Dd10b64eE86a1c1b81202C0028",
                  "contractAddress": "0xc57cb2F7b3292Cb7531F5f1aD247214026E13f90",
                  "transactionIndex": 0,
                  "gasUsed": {
                    "type": "BigNumber",
                    "hex": "0x03d11e"
                  },
                  "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                  "blockHash": "0x9e6eb31d1d9ff7ad9db54b671deb13439d49036e4b1ba56a8f0300a814e45bec",
                  "transactionHash": "0x1ec7916bd1e845eb8db3fadd41f1e74d0f3d1a52f509920f415fe387728edba3",
                  "logs": [],
                  "blockNumber": 6619256,
                  "confirmations": 1,
                  "cumulativeGasUsed": {
                    "type": "BigNumber",
                    "hex": "0x03d11e"
                  },
                  "effectiveGasPrice": {
                    "type": "BigNumber",
                    "hex": "0x9502f90b"
                  },
                  "status": 1,
                  "type": 2,
                  "byzantium": true
                };*/

              // send toast
            })
            .catch(reason => {
              console.error(reason);
              // send error toast

              // mark tx as failed?
            });
          // right now, while the promise is resolving we do the initial dispatch and toast.
          dispatch({
            type: "ADD",
            hash: payload.result,
            from: accountData.address,
            chainId: networkData.chain?.id,
            summary
          });
          // push toast
          sendToast(payload.result, true, summary);
        }
      } // else ignore.
    },
    [dispatch, networkData, accountData, provider, transactions]
  );
}
