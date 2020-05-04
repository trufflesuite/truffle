import { combineReducers } from "redux";

import * as actions from "./actions";

const DEFAULT_SOURCES = {
  byCompilationId: {} //by compilation, then in an array
};

function sources(state = DEFAULT_SOURCES, action) {
  switch (action.type) {
    /*
     * Adding new sources
     */
    case actions.ADD_SOURCES:
      return {
        byCompilationId: Object.assign(
          {},
          ...Object.entries(action.compilations).map(([id, compilation]) => ({
            [id]: {
              byId: compilation
            }
          }))
        )
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

function functionDepthStack(state = [], action) {
  switch (action.type) {
    case actions.JUMP:
      let newState = state.slice(); //clone the state
      const delta = spelunk(action.jumpDirection);
      let top = newState[newState.length - 1];
      let belowTop = newState.length > 1 ? newState[newState.length - 2] : -1;
      newState[newState.length - 1] = Math.max(top + delta, belowTop + 1);
      return newState;

    case actions.RESET:
      return [0];

    case actions.UNLOAD_TRANSACTION:
      return [];

    case actions.EXTERNAL_CALL:
      if (state.length === 0) {
        return [0];
      }
      return [...state, state[state.length - 1] + 1];

    case actions.EXTERNAL_RETURN:
      //just pop the stack! unless, HACK, that would leave it empty
      return state.length > 1 ? state.slice(0, -1) : state;

    default:
      return state;
  }
}

function nextFrameIsPhantom(state = null, action) {
  switch (action.type) {
    case actions.CLEAR_PHANTOM_GUARD:
      return false;
    case actions.EXTERNAL_RETURN:
      return false;
    case actions.JUMP:
      if (action.jumpDirection === "o") {
        return false;
      } else {
        return state;
      }
    case actions.EXTERNAL_CALL:
      return action.guard;
    case actions.RESET:
      return action.guard;
    case actions.UNLOAD_TRANSACTION:
      return null;
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
  functionDepthStack,
  nextFrameIsPhantom
});

const reducer = combineReducers({
  info,
  proc
});

export default reducer;
