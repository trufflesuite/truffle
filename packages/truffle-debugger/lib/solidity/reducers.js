import { combineReducers } from "redux";

import * as actions from "./actions";

export function functionDepth(state = 1, action) {
  if (action.type === actions.JUMP) {
    const delta = spelunk(action.jumpDirection)
    return state + delta;
  } else {
    return state;
  }
}

function spelunk(jump) {
  if (jump == "i") {
    return 1;
  } else if (jump == "o") {
    return -1;
  } else {
    return 0;
  }
}

const proc = combineReducers({
  functionDepth
});

const reducer = combineReducers({
  proc
});

export default reducer;
