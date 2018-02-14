import { combineReducers } from "redux";

import context from "../context/reducers";
import data from "../data/reducers";
import evm from "../evm/reducers";
import solidity from '../solidity/reducers';
import trace from "../trace/reducers";

import * as actions from "./actions";

export const WAITING = "WAITING";
export const ACTIVE = "ACTIVE";
export const FINISHED = "FINISHED";

export function session(state = WAITING, action) {
  switch (action.type) {
    case actions.READY:
      return ACTIVE;

    case actions.FINISH:
      return FINISHED;

    default:
      return state;
  }
}

const reduceState = combineReducers({
  session,
  context,
  data,
  evm,
  solidity,
  trace,
});

export default reduceState;
