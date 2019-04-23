import { combineReducers } from "redux";

import data from "lib/data/reducers";
import evm from "lib/evm/reducers";
import solidity from "lib/solidity/reducers";
import trace from "lib/trace/reducers";
import controller from "lib/controller/reducers";

import * as actions from "./actions";

export const WAITING = "WAITING";
export const ACTIVE = "ACTIVE";

function status(state = WAITING, action) {
  switch (action.type) {
    case actions.READY:
      return ACTIVE;

    case actions.LOAD:
      return WAITING;

    case actions.ERROR:
      return { error: action.error };

    default:
      return state;
  }
}

function transaction(state = {}, action) {
  switch (action.type) {
    case actions.SAVE_TRANSACTION:
      return action.transaction;
    case actions.UNLOAD:
      return {};
    default:
      return state;
  }
}

function receipt(state = {}, action) {
  switch (action.type) {
    case actions.SAVE_RECEIPT:
      return action.receipt;
    case actions.UNLOAD:
      return {};
    default:
      return state;
  }
}

function block(state = {}, action) {
  switch (action.type) {
    case actions.SAVE_BLOCK:
      return action.block;
    case actions.UNLOAD:
      return {};
    default:
      return state;
  }
}

const session = combineReducers({
  status,
  transaction,
  receipt,
  block
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
