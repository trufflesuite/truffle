import debugModule from "debug";
const debug = debugModule("debugger:trace:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

function index(state = 0, action) {
  switch (action.type) {
    case actions.TOCK:
      return state + 1;

    case actions.RESET:
    case actions.UNLOAD_TRANSACTION:
      return 0;

    default:
      return state;
  }
}

function finished(state = false, action) {
  switch (action.type) {
    case actions.END_OF_TRACE:
      return true;

    case actions.RESET:
    case actions.UNLOAD_TRANSACTION:
      return false;

    default:
      return state;
  }
}

function steps(state = null, action) {
  switch (action.type) {
    case actions.SAVE_STEPS:
      return action.steps;
    case actions.UNLOAD_TRANSACTION:
      debug("unloading");
      return null;
    default:
      return state;
  }
}

const transaction = combineReducers({
  steps
});

const proc = combineReducers({
  index,
  finished
});

const reducer = combineReducers({
  transaction,
  proc
});

export default reducer;
