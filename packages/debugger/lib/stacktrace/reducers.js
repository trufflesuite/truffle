import debugModule from "debug";
const debug = debugModule("debugger:stacktrace:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

function callstack(state = [], action) {
  let top;
  let newFrame;
  switch (action.type) {
    case actions.JUMP_IN:
      let { from, functionNode } = action;
      newFrame = {
        type: "internal",
        calledFromPosition: from,
        name:
          functionNode && functionNode.nodeType === "FunctionDefinition"
            ? functionNode.name
            : undefined,
        //note we don't currently account for getters because currently
        //we can't; fallback, receive, constructors, & modifiers also remain
        //unaccounted for at present
        //(none of these things have associated jump-in markings!)
        skippedInReports: false
      };
      return [...state, newFrame];
    case actions.JUMP_OUT:
      top = state[state.length - 1];
      if (top && top.type === "internal") {
        return state.slice(0, -1);
      } else {
        return state;
      }
    case actions.EXTERNAL_CALL:
      newFrame = {
        type: "external",
        calledFromPosition: action.from,
        skippedInReports: action.skippedInReports,
        name: undefined
      };
      return [...state, newFrame];
    case actions.EXECUTE_RETURN:
      let newState = state.slice(); //clone the state
      //I'm going to write this the C way, hope you don't mind :P
      let counter = action.counter;
      while (counter > 0 && newState.length > 0) {
        top = newState[newState.length - 1];
        if (top.type === "external") {
          counter--;
        }
        newState.pop();
      }
      return newState;
    case actions.RESET:
      return [state[0]];
    case actions.UNLOAD_TRANSACTION:
      return [];
    default:
      //note that we don't do anything on EXTERNAL_RETURN!
      //the callstack only changes on EXECUTE_RETURN!
      return state;
  }
}

function returnCounter(state = 0, action) {
  switch (action.type) {
    case actions.EXTERNAL_RETURN:
      return state + 1;
    case actions.EXECUTE_RETURN:
    case actions.RESET:
    case actions.UNLOAD_TRANSACTION:
      return 0;
    default:
      return state;
  }
}

function markedPosition(state = null, action) {
  switch (action.type) {
    case actions.MARK_RETURN_POSITION:
      return action.location;
    case actions.EXECUTE_RETURN:
    case actions.RESET:
    case actions.UNLOAD_TRANSACTION:
      return null;
    default:
      return state;
  }
}

function innerReturnPosition(state = null, action) {
  switch (action.type) {
    case actions.EXTERNAL_RETURN:
      return action.from;
    case actions.EXECUTE_RETURN:
    case actions.RESET:
    case actions.UNLOAD_TRANSACTION:
      return null;
    default:
      return state;
  }
}

function innerReturnStatus(state = null, action) {
  switch (action.type) {
    case actions.EXTERNAL_RETURN:
      return action.status;
    case actions.EXECUTE_RETURN:
    case actions.RESET:
    case actions.UNLOAD_TRANSACTION:
      return null;
    default:
      return state;
  }
}

function justReturned(state = false, action) {
  switch (action.type) {
    case actions.EXTERNAL_RETURN:
      debug("setting returned flag");
      return true;
    case actions.MARK_RETURN_POSITION:
      debug("clearing returned flag");
      return false;
    default:
      return state;
  }
}

const proc = combineReducers({
  callstack,
  returnCounter,
  markedPosition,
  innerReturnPosition,
  innerReturnStatus,
  justReturned
});

const reducer = combineReducers({
  proc
});

export default reducer;
