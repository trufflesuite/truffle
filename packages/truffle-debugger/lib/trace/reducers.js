import { combineReducers } from "redux";

import { TOCK } from "./actions";

export function index(state = 0, action) {
  if (action.type == TOCK) {
    return state + 1;
  } else {
    return state;
  }
}

const reducer = combineReducers({
  index
});

export default reducer;
