import debugModule from "debug";
const debug = debugModule("debugger:controller:reducers"); //eslint-disable-line no-unused-vars

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

const reducer = combineReducers({
  breakpoints
});

export default reducer;
