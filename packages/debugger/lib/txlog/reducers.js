import debugModule from "debug";
const debug = debugModule("debugger:txlog:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

function transactionLog(state = [], action) {
  //The first few cases just append to the log (or, occasionally, don't).
  //Most cases primarily append to the log, but also, if the previous
  //entry was a callexternal of kind library, will modify it to be of kind
  //message.
  //The final case, identify function call, *only* modifies the last entry
  //and appends nothing.
  //(...and then there's also reset and unload transaction)
  switch (action.type) {
    case actions.INTERNAL_CALL: {
      const lastAction = state[state.length - 1];
      if (
        lastAction.type === "callexternal" &&
        lastAction.kind !== "constructor" &&
        lastAction.waitingForFunctionDefinition
      ) {
        //this is for handling post-0.5.1 initial jump-ins; don't add
        //a separate internal call if we're sitting on an external call
        //waiting to be identified
        //However, note that we don't do this for constructors, because
        //for constructors, an initializer could run first.  Fortunately
        //constructors don't have a jump in, so it works out OK!
        return state;
      } else {
        return [
          ...state,
          { type: "callinternal", waitingForFunctionDefinition: true }
        ];
      }
    }
    case actions.INTERNAL_RETURN:
      return [
        ...state,
        { type: "returninternal", variables: action.variables }
      ];
    case actions.RECORD_ORIGIN:
      return [...state, { type: "origin", address: action.address }];
    case actions.INSTANT_EXTERNAL_CALL:
    case actions.EXTERNAL_CALL: {
      const {
        address,
        context,
        value,
        isDelegate,
        kind,
        decoding,
        calldata,
        status
      } = action;
      const contractName = context ? context.contractName : undefined;
      let functionName, variables;
      if (decoding.kind === "function") {
        //note: in this case we should also have kind === "function"
        functionName = decoding.abi.name;
        variables = decoding.arguments;
      }
      const newEntry = {
        type: "callexternal",
        address,
        context,
        contractName,
        value,
        isDelegate,
        kind,
        functionName,
        variables,
        calldata,
        //If kind === "message", set waiting to false.
        //Why?  Well, because fallback functions and receive functions
        //typically have their function definitions skipped over, so the next
        //one we hit would instead be a function *called* from the fallback
        //function, which is not what we want.
        waitingForFunctionDefinition: kind !== "message",
        instant: action.type === actions.INSTANT_EXTERNAL_CALL,
        status //will be undefined if not instant!
      };
      const modifiedLog = setLastEntryAsMessageIfLibrary(state);
      return [...modifiedLog, newEntry];
    }
    case actions.INSTANT_CREATE:
    case actions.CREATE: {
      const {
        address,
        binary,
        context,
        value,
        salt,
        decoding,
        status
      } = action;
      const contractName = context ? context.contractName : undefined;
      let variables;
      if (decoding.kind === "constructor") {
        variables = decoding.arguments;
      }
      let newEntry = {
        type: "callexternal",
        kind: context ? "constructor" : "unknowncreate",
        address,
        context,
        contractName,
        value,
        salt,
        variables,
        binary,
        waitingForFunctionDefinition: true,
        instant: action.type === actions.INSTANT_CREATE,
        status //will be undefined if not instant!
      };
      const modifiedLog = setLastEntryAsMessageIfLibrary(state);
      return [...modifiedLog, newEntry];
    }
    case actions.EXTERNAL_RETURN: {
      const newEntry = { type: "returnexternal", decodings: action.decodings };
      const modifiedLog = setLastEntryAsMessageIfLibrary(state);
      return [...modifiedLog, newEntry];
    }
    case actions.REVERT: {
      const newEntry = { type: "revert", message: action.message };
      const modifiedLog = setLastEntryAsMessageIfLibrary(state);
      return [...modifiedLog, newEntry];
    }
    case actions.SELFDESTRUCT: {
      const newEntry = {
        type: "selfdestruct",
        beneficiary: action.beneficiary
      };
      const modifiedLog = setLastEntryAsMessageIfLibrary(state);
      return [...modifiedLog, newEntry];
    }
    case actions.IDENTIFY_FUNCTION_CALL: {
      //This case is special.  Most other cases primarily append to the log;
      //this case instead just modifies the last entry with nothing appended.
      const { functionNode, contractNode, variables } = action;
      const lastCall = state[state.length - 1];
      let modifiedCall = { ...lastCall, waitingForFunctionDefinition: false };
      //note: I don't handle the following with { stuff, ...lastCall, moreStuff } because
      //I want lastCall take precedence over the following even if what it has is undefined or null,
      //*not* just if it's not present at all
      if (!modifiedCall.functionName) {
        //we don't bother checking if functionNode is null because this action should only
        //happen when it's not
        modifiedCall.functionName = functionNode.name
          ? functionNode.name
          : undefined; //replace "" with undefined
      }
      if (!modifiedCall.contractName) {
        modifiedCall.contractName =
          contractNode && contractNode.nodeType === "ContractDefinition"
            ? contractNode.name
            : null;
      }
      if (!modifiedCall.variables) {
        modifiedCall.variables = variables;
      }
      //now: resolve the kind if it was library
      if (
        modifiedCall.type === "callexternal" &&
        modifiedCall.kind === "library"
      ) {
        modifiedCall.kind = "function";
      }
      return [...state.slice(0, -1), modifiedCall];
    }
    case actions.RESET:
      return state.slice(0, 2); //keep origin and initial call
    case actions.UNLOAD_TRANSACTION:
      return [];
    default:
      return state;
  }
}

function setLastEntryAsMessageIfLibrary(log) {
  const lastEntry = log[log.length - 1];
  if (lastEntry.type === "callexternal" && lastEntry.kind === "library") {
    return [...log.slice(0, -1), { ...lastEntry, kind: "message" }];
  } else {
    return log;
  }
}

const proc = combineReducers({
  transactionLog
});

const reducer = combineReducers({
  proc
});

export default reducer;
