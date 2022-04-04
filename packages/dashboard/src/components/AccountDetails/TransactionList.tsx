import { FC, useMemo } from "react";
import Transaction from "src/components/AccountDetails/Transaction";
import Button from "src/components/Common/Button";
import { useTransactionStore } from "src/context/transactions/context";
import {
  isTransactionRecent,
  useAllTransactions
} from "src/context/transactions/hooks";
import { TransactionDetails } from "src/context/transactions/types";

interface TransactionsProps {}

// we want the latest one to come first, so return negative if a is after b
const newTransactionsFirst = (a: TransactionDetails, b: TransactionDetails) =>
  b.addedTime - a.addedTime;

export const TransactionList: FC<TransactionsProps> = () => {
  const { dispatch } = useTransactionStore();

  const allTransactions = useAllTransactions();

  const sortedRecentTransactions = useMemo(() => {
    const txs = Object.values(allTransactions);
    return txs.filter(isTransactionRecent).sort(newTransactionsFirst);
  }, [allTransactions]);

  const pendingTransactions = sortedRecentTransactions
    .filter(tx => !tx.receipt)
    .map(tx => tx.hash);
  const confirmedTransactions = sortedRecentTransactions
    .filter(tx => tx.receipt)
    .map(tx => tx.hash);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className={""}>Recent Transactions</div>
        <Button
          color="red"
          size="xs"
          onClick={() => dispatch({ type: "CLEAR" })}
        >
          {" "}
          Clear all{" "}
        </Button>
      </div>
      <div className="flex flex-col divide-y divide-dark-800">
        {!!pendingTransactions.length || !!confirmedTransactions.length ? (
          <>
            {pendingTransactions.map((el, index) => (
              <Transaction key={index} hash={el} />
            ))}
            {confirmedTransactions.map((el, index) => (
              <Transaction key={index} hash={el} />
            ))}
          </>
        ) : (
          <div>Your transactions will appear here...</div>
        )}
      </div>
    </>
  );
};
