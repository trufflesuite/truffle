import { combineReducers } from "redux";

import data from "lib/data/reducers";
import evm from "lib/evm/reducers";
import solidity from "lib/solidity/reducers";
import trace from "lib/trace/reducers";

import * as actions from "./actions";

export const WAITING = "WAITING";
export const ACTIVE = "ACTIVE";
export const ERROR = "ERROR";
export const FINISHED = "FINISHED";

export function session(state = WAITING, action) {
  switch (action.type) {
    case actions.READY:
      return ACTIVE;

    case actions.ERROR:
      return { error: action.error };

    case actions.FINISH:
      return FINISHED;

    default:
      return state;
  }
}

const reduceState = combineReducers({
  session,
  data,
  evm,
  solidity,
  trace,
});

export default reduceState;
