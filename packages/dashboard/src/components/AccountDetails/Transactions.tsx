import {FC} from "react";
import Button from "src/components/Common/Button";
import {ChainId} from "src/constants/ChainId";
import {useTransactionStore} from "src/context/transactions/context";
import {useTransactionAdder} from "src/context/transactions/hooks";

interface TransactionsProps {
}

export const Transactions: FC<TransactionsProps> = () => {

  const addTx = useTransactionAdder();

  function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  const {state, dispatch} = useTransactionStore();

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
        {JSON.stringify(state)}
      </div>
    </>
  );
};


{/* {!!pendingTransactions.length || !!confirmedTransactions.length ? ( */
}
{/*      <>*/
}
{/*        {pendingTransactions.map((el, index) => (*/
}
{/*          <Transaction key={index} hash={el} />*/
}
{/*        ))}*/
}
{/*        {confirmedTransactions.map((el, index) => (*/
}
{/*          <Transaction key={index} hash={el} />*/
}
{/*        ))}*/
}
{/*      </>*/
}
{/*    ) : (*/
}
{/*      <Typography variant="xs" weight={700} className="text-secondary">*/
}
{/*        {i18n._(t`Your transactions will appear here...`)}*/
}
{/*      </Typography>*/
}
{/*    )}*/
}
