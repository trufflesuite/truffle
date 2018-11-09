import { combineReducers } from "redux";

import * as actions from "./actions";

export function index(state = 0, action) {
  switch (action.type) {
    case actions.TOCK:
      return state + 1;

    case actions.RESET:
      return 0;

    default:
      return state;
  }
}

export function finished(state = false, action) {
  switch (action.type) {
    case actions.END_OF_TRACE:
      return true;

    case actions.RESET:
      return false;

    default:
      return state;
  }
}

export function steps(state = null, action) {
  if (action.type === actions.SAVE_STEPS) {
    return action.steps;
  } else {
    return state;
  }
}

const info = combineReducers({
  steps
});

const proc = combineReducers({
  index,
  finished
});

const reducer = combineReducers({
  info,
  proc
});

export default reducer;
