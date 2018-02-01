import { combineReducers } from "redux";

export function pointer(state = {}, action) {
  switch (action.type) {

    default:
      return state;
  }
}

const reducer = combineReducers({
  pointer
});

export default reducer;
