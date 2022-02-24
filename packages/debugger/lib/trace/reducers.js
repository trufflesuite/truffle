import debugModule from "debug";
const debug = debugModule("debugger:trace:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

function index(state = 0, action) {
  switch (action.type) {
    case actions.ADVANCE:
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

function submoduleCount(state = 0, action) {
  switch (action.type) {
    case actions.SET_SUBMODULE_COUNT:
      return action.count;
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

const application = combineReducers({
  submoduleCount
});

const reducer = combineReducers({
  transaction,
  proc,
  application
});

export default reducer;
