import debugModule from "debug";
const debug = debugModule("debugger:solidity:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";
import flatten from "lodash.flatten";

const DEFAULT_SOURCES = {
  byCompilationId: {}, //user sources
  byContext: {} //internal sources
};

//This piece of state is organized as follows:
//1. byId: contains all the sources, by ID.  straightforward.
//2. byCompilationId: contains the IDs of the user sources,
//organized by compilation ID and then index (this last part
//takes the form of an array).
//3. byContext: contains the IDs of the internal sources,
//organized by context hash and then index (again, this
//last part takes the form of an array, although a sparse
//array be aware).
function sources(state = DEFAULT_SOURCES, action) {
  switch (action.type) {
    /*
     * Adding new sources
     */
    case actions.ADD_SOURCES:
      //NOTE: this code assumes that we are only ever adding compilations or contexts
      //wholesale, and never adding to existing ones!
      return {
        byCompilationId: {
          ...state.byCompilationId,
          ...Object.assign(
            {},
            ...Object.entries(action.sources.user).map(([id, compilation]) => ({
              [id]: {
                byIndex: compilation.map(source => source.id)
              }
            }))
          )
        },
        byContext: {
          ...state.byContext,
          ...Object.assign(
            {},
            ...Object.entries(action.sources.internal).map(
              ([hash, context]) => ({
                [hash]: {
                  byIndex: context.map(source => source.id)
                }
              })
            )
          )
        },
        byId: {
          ...state.byId,
          ...Object.assign(
            {},
            ...flatten(
              Object.values(action.sources.user).concat(
                Object.values(action.sources.internal)
              )
            ).map(source => (source ? { [source.id]: source } : {}))
          )
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
