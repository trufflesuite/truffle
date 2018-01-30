import { combineReducers } from "redux";

import context from "../context/reducers";
import evm from "../evm/reducers";
import solidity from '../solidity/reducers';
import trace from "../trace/reducers";

export const WAITING = "WAITING";
export const READY = "READY";
export const FINISHED = "FINISHED";

export function session(state = WAITING, action) {
  switch (action.type) {
    default:
      return state;
  }
}

const reduceState = combineReducers({
  session,
  context,
  evm,
  solidity,
  trace,
});

export default reduceState;
