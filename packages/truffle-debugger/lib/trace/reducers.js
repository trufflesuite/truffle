import { combineReducers } from "redux";

import { TOCK, END_OF_TRACE } from "./actions";

export function index(state = 0, action) {
  if (action.type == TOCK || action.type == END_OF_TRACE) {
    return state + 1;
  } else {
    return state;
  }
}

const reducer = combineReducers({
  index
});

export default reducer;
