import React, {Dispatch} from "react";
import {ChainId} from "src/constants/ChainId";
import {SerializableTransactionReceipt, TransactionState} from "src/context/transactions/types";

const now = () => new Date().getTime();

type Action =
  | { type: 'ADD', chainId: ChainId, from: string, hash: string, summary: string }
  | { type: 'FINALIZE', chainId: ChainId, hash: string, receipt: SerializableTransactionReceipt }
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
      if (state[action.chainId]?.[action.hash]) {
        // FIXME: need to handle this error...
        throw Error('Attempted to add existing transaction.');
      }
      // now we have a clone or new one.
      const txs = Object.assign({}, state[action.chainId]);
      txs[action.hash] = {
        hash: action.hash,
        from: action.from,
        summary: action.summary,
        addedTime: now()
      };
      return {...state, [action.chainId]: txs };
    case "FINALIZE":
      const chainTxs = Object.assign({}, state[action.chainId]);
      if(!chainTxs){
        return state;
      }
      const tx = chainTxs?.[action.hash];
      if(!tx){
        return state;
      }
      tx.receipt = action.receipt;
      tx.confirmedTime = now();
      return {...state, [action.chainId]: chainTxs };
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
