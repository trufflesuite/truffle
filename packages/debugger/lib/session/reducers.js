import debugModule from "debug";
const debug = debugModule("debugger:session:reducers");

import { combineReducers } from "redux";

import data from "lib/data/reducers";
import evm from "lib/evm/reducers";
import solidity from "lib/solidity/reducers";
import trace from "lib/trace/reducers";
import controller from "lib/controller/reducers";
import stacktrace from "lib/stacktrace/reducers";
import txlog from "lib/txlog/reducers";

import * as actions from "./actions";

function ready(state = false, action) {
  switch (action.type) {
    case actions.READY:
      debug("readying");
      return true;

    case actions.WAIT:
      return false;

    default:
      return state;
  }
}

function lastLoadingError(state = null, action) {
  switch (action.type) {
    case actions.ERROR:
      debug("error: %o", action.error);
      return action.error;

    case actions.WAIT:
      return null;

    default:
      return state;
  }
}

function transaction(state = {}, action) {
  switch (action.type) {
    case actions.SAVE_TRANSACTION:
      return action.transaction;
    case actions.UNLOAD_TRANSACTION:
      return {};
    default:
      return state;
  }
}

function receipt(state = {}, action) {
  switch (action.type) {
    case actions.SAVE_RECEIPT:
      return action.receipt;
    case actions.UNLOAD_TRANSACTION:
      return {};
    default:
      return state;
  }
}

function block(state = {}, action) {
  switch (action.type) {
    case actions.SAVE_BLOCK:
      return action.block;
    case actions.UNLOAD_TRANSACTION:
      return {};
    default:
      return state;
  }
}

function lightMode(state = false, action) {
  switch (action.type) {
    case actions.SET_LIGHT_MODE:
      return true;
    case actions.SET_FULL_MODE:
      return false;
    default:
      return state;
  }
}

const session = combineReducers({
  ready,
  lastLoadingError,
  transaction,
  receipt,
  block,
  lightMode
});

const reduceState = combineReducers({
  session,
  data,
  txlog,
  evm,
  solidity,
  stacktrace,
  trace,
  controller
});

export default reduceState;
