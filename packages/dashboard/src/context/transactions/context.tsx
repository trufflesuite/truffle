import React, {Dispatch} from "react";
import {ChainId} from "src/constants/ChainId";
import {TransactionState} from "src/context/transactions/types";

const now = () => new Date().getTime();

type Action =
  | { type: 'ADD', chainId: ChainId, from: string, hash: string }
  | { type: 'CHECK', chainId: ChainId }
  | { type: 'FINALIZE', chainId: ChainId, hash: string, receipt: any }
  | { type: 'CLEAR' };


export const TransactionContext = React.createContext<{
  state: TransactionState,
  dispatch: Dispatch<Action>
}>({
  state: {},
  dispatch: () => null
});

TransactionContext.displayName = 'Transactions';

const initialState: TransactionState = {};

export const useTransactionStore = () => React.useContext(TransactionContext);

export const txReducer = (state: TransactionState, action: Action) => {
  switch (action.type) {
    case "ADD":
      const {chainId, hash, from} = action;
      if (state[chainId]?.[hash]) {
        throw Error('Attempted to add existing transaction.');
      }
      // now we have a clone or new one.
      const txs = Object.assign({}, state[chainId]);
      txs[hash] = {
        hash,
        from,
        addedTime: now()
      };
      return {...state, [chainId]: txs };
    case "CLEAR":
      return {};
    default:
      return state;
  }
};


export const TransactionProvider: React.FC = ({children}) => {
  const [state, dispatch] = React.useReducer(txReducer, initialState);
  return (
    <TransactionContext.Provider value={{state, dispatch}}>
      {children}
    </TransactionContext.Provider>
  );

};
