import debugModule from "debug";
const debug = debugModule("debugger:stacktrace:reducers");

import { combineReducers } from "redux";
import { popNWhere } from "lib/helpers";

import * as actions from "./actions";

function callstack(state = [], action) {
  let newFrame;
  switch (action.type) {
    case actions.JUMP_IN:
      let { location, functionNode, contractNode } = action;
      newFrame = {
        type: "internal",
        calledFromLocation: location,
        address: state[state.length - 1].address,
        functionName:
          functionNode &&
          (functionNode.nodeType === "FunctionDefinition" ||
            functionNode.nodeType === "YulFunctionDefinition")
            ? functionNode.name
            : undefined,
        contractName:
          contractNode && contractNode.nodeType === "ContractDefinition"
            ? contractNode.name
            : undefined
        //note we don't currently account for getters because currently
        //we can't; fallback, receive, constructors, & modifiers also remain
        //unaccounted for at present
        //(none of these things have associated jump-in markings!)
      };
      return [...state, newFrame];
    case actions.JUMP_OUT:
      let top = state[state.length - 1];
      if (top && top.type === "internal") {
        return state.slice(0, -1);
      } else {
        return state;
      }
    case actions.EXTERNAL_CALL:
      newFrame = {
        type: "external",
        address: action.address,
        calledFromLocation: action.location,
        functionName: undefined,
        contractName: action.context.contractName
      };
      return [...state, newFrame];
    case actions.EXECUTE_RETURN:
      return popNWhere(
        state,
        action.counter,
        frame => frame.type === "external"
      );
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

function lastPosition(state = null, action) {
  switch (action.type) {
    case actions.JUMP_IN:
    case actions.JUMP_OUT:
    case actions.ETERNAL_CALL:
    case actions.EXTERNAL_RETURN:
    case actions.UPDATE_POSITION:
    case actions.EXECUTE_RETURN:
      const { location } = action;
      if (location.source.id === undefined || location.source.internal) {
        //don't update for unmapped or internal!
        return state;
      }
      return location;
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
      //we want the innermost return, so don't update
      //this if it's not presently null
      return state || action.from;
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
      //we want the innermost return, so don't update
      //this if it's not presently null
      return state === null ? action.status : state;
    case actions.EXECUTE_RETURN:
    case actions.RESET:
    case actions.UNLOAD_TRANSACTION:
      return null;
    default:
      return state;
  }
}

const proc = combineReducers({
  callstack,
  returnCounter,
  lastPosition,
  innerReturnPosition,
  innerReturnStatus
});

const reducer = combineReducers({
  proc
});

export default reducer;
