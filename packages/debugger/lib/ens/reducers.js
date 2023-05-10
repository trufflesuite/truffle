import debugModule from "debug";
const debug = debugModule("debugger:ens:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

function cache(state = {}, action) {
  if (action.type === actions.RECORD) {
    return { ...state, [action.address]: action.name };
  } else {
    return state;
  }
}

const proc = combineReducers({
  cache
});

const reducer = combineReducers({
  proc
});

export default reducer;
