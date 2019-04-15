import { combineReducers } from "redux";

import * as actions from "./actions";

const DEFAULT_SOURCES = {
  byId: {}
};

function sources(state = DEFAULT_SOURCES, action) {
  switch (action.type) {
    /*
     * Adding a new source
     */
    case actions.ADD_SOURCE:
      let { ast, source, sourcePath, compiler } = action;

      let id = Object.keys(state.byId).length;

      return {
        byId: {
          ...state.byId,

          [id]: {
            id,
            ast,
            source,
            sourcePath,
            compiler
          }
        }
      };

    /*
     * Default case
     */
    default:
      return state;
  }
}

const info = combineReducers({
  sources
});

function functionDepthStack(state = [0], action) {
  switch (action.type) {
    case actions.JUMP:
      let newState = state.slice(); //clone the state
      const delta = spelunk(action.jumpDirection);
      let top = newState[newState.length - 1];
      newState[newState.length - 1] = top + delta;
      return newState;

    case actions.RESET:
      return [0];

    case actions.EXTERNAL_CALL:
      return [...state, state[state.length - 1] + 1];

    case actions.EXTERNAL_RETURN:
      //just pop the stack! unless, HACK, that would leave it empty
      return state.length > 1 ? state.slice(0, -1) : state;

    default:
      return state;
  }
}

function spelunk(jump) {
  if (jump === "i") {
    return 1;
  } else if (jump === "o") {
    return -1;
  } else {
    return 0;
  }
}

const proc = combineReducers({
  functionDepthStack
});

const reducer = combineReducers({
  info,
  proc
});

export default reducer;
