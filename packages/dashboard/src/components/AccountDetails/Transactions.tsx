import {FC, useMemo} from "react";
import Transaction from "src/components/AccountDetails/Transaction";
import Button from "src/components/Common/Button";
import {ChainId} from "src/constants/ChainId";
import {useTransactionStore} from "src/context/transactions/context";
import {isTransactionRecent, useAllTransactions, useTransactionAdder} from "src/context/transactions/hooks";
import {TransactionDetails} from "src/context/transactions/types";

interface TransactionsProps {
}

// we want the latest one to come first, so return negative if a is after b
const newTransactionsFirst = (a: TransactionDetails, b: TransactionDetails) => b.addedTime - a.addedTime;

export const Transactions: FC<TransactionsProps> = () => {

  const addTx = useTransactionAdder();

  function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  const {dispatch} = useTransactionStore();

  const allTransactions = useAllTransactions();

  const sortedRecentTransactions = useMemo(() => {
    const txs = Object.values(allTransactions);
    return txs.filter(isTransactionRecent).sort(newTransactionsFirst);
  }, [allTransactions]);

  const pendingTransactions = sortedRecentTransactions.filter((tx) => !tx.receipt).map((tx) => tx.hash);
  const confirmedTransactions = sortedRecentTransactions.filter((tx) => tx.receipt).map((tx) => tx.hash);


  const createTx = () => {
    // need to create a TX here...
    addTx({
      chainId: ChainId.GÖRLI,
      hash: "0xe4563-" + getRandomInt(100000),
      from: "my_address"
    });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className={""}>Recent Transactions</div>
        <Button color="red" size="xs" onClick={() => dispatch({type: "CLEAR"})}> Clear all </Button>
      </div>
      <div className="flex items-center justify-between">
        <Button color="red" size="xs" onClick={createTx}>create tx</Button>
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



