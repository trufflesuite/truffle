import { combineReducers } from "redux";

import data from "lib/data/reducers";
import evm from "lib/evm/reducers";
import solidity from "lib/solidity/reducers";
import trace from "lib/trace/reducers";
import controller from "lib/controller/reducers";

import * as actions from "./actions";

export const WAITING = "WAITING";
export const ACTIVE = "ACTIVE";
export const ERROR = "ERROR";

export function status(state = WAITING, action) {
  //theState to avoid name collision
  switch (action.type) {
    case actions.READY:
      return ACTIVE;

    case actions.ERROR:
      return { error: action.error };

    default:
      return state;
  }
}

export function transaction(state = {}, action) {
  switch(action.type) {
    case actions.SAVE_TRANSACTION:
      return {
        ...state,
        ...action.transaction
      }
    case actions.SAVE_RECEIPT:
      return {
        ...state,
        ...action.receipt
      }
    default:
      return state;
  }
}

const session = combineReducers({
  status,
  transaction
});

const reduceState = combineReducers({
  session,
  data,
  evm,
  solidity,
  trace,
  controller
});

export default reduceState;
