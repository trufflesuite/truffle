import debugModule from "debug";
const debug = debugModule("debugger:controller:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

function breakpoints(state = [], action) {
  switch (action.type) {
    case actions.ADD_BREAKPOINT:
      //check for any existing identical breakpoints to avoid redundancy
      if (
        state.filter(
          breakpoint =>
            breakpoint.sourceId === action.breakpoint.sourceId &&
            breakpoint.line === action.breakpoint.line &&
            breakpoint.node === action.breakpoint.node //may be undefined
        ).length > 0
      ) {
        //if it's already there, do nothing
        return state;
      } else {
        //otherwise add it
        return state.concat([action.breakpoint]);
      }
      break;

    case actions.REMOVE_BREAKPOINT:
      return state.filter(
        breakpoint =>
          breakpoint.sourceId !== action.breakpoint.sourceId ||
          breakpoint.line !== action.breakpoint.line ||
          breakpoint.node !== action.breakpoint.node //may be undefined
      );
      break;

    case actions.REMOVE_ALL_BREAKPOINTS:
      return [];

    default:
      return state;
  }
}

const CONTROL_ACTIONS = [
  actions.ADVANCE,
  actions.STEP_NEXT,
  actions.STEP_OVER,
  actions.STEP_INTO,
  actions.STEP_OUT,
  actions.CONTINUE,
  actions.RESET
];

function isStepping(state = false, action) {
  if (CONTROL_ACTIONS.includes(action.type)) {
    debug("got step start action");
    return true;
  } else if (action.type === actions.DONE_STEPPING) {
    debug("got step stop action");
    return false;
  } else {
    return state;
  }
}

const reducer = combineReducers({
  breakpoints,
  isStepping
});

export default reducer;
