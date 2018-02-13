import { combineReducers } from "redux";

import context from "../context/reducers";
import evm from "../evm/reducers";
import ast from "../ast/reducers";
import solidity from '../solidity/reducers';
import trace from "../trace/reducers";

import * as actions from "./actions";

export const WAITING = "WAITING";
export const READY = "READY";
export const FINISHED = "FINISHED";

export function session(state = WAITING, action) {
  switch (action.type) {
    case actions.READY:
      return READY;

    default:
      return state;
  }
}

const reduceState = combineReducers({
  session,
  context,
  ast,
  evm,
  solidity,
  trace,
});

export default reduceState;
