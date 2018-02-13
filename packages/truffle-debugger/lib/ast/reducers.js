import { combineReducers } from "redux";

import * as actions from "./actions";

export function storage(state = {}, action) {
  switch (action.type) {
    case actions.ASSIGN_STORAGE:
      return {
        ...state,

        [action.binary]: {
          ...state[action.binary],

          [action.variable]: action.value
        }
      };

    default:
      return state;
  }
}

const reducer = combineReducers({
  storage
});

export default reducer;
