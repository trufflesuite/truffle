import debugModule from "debug";
const debug = debugModule("debugger:txlog:reducers");

import { combineReducers } from "redux";

import * as actions from "./actions";

function transactionLog(state = [], action) {
  //note that aside from resetting or unloading, we only ever append to
  //the log; processing into tree form happens in the selectors
  switch (action.type) {
    case actions.INTERNAL_CALL:
      return [
        ...state,
        { type: "callinternal", waitingForFunctionDefinition: true }
      ];
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
        absorbNextInternalCall,
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
        //if kind is message or constructor, we don't want to absorb.
        //but, for constructors absorb will already be false, so we don't need to
        //explicitly disallow that.
        //(so: absorb for function & library only)
        absorbNextInternalCall: absorbNextInternalCall && kind !== "message",
        instant: action.type === actions.INSTANT_EXTERNAL_CALL,
        status //will be undefined if not instant!
      };
      return [...state, newEntry];
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
        absorbNextInternalCall: false,
        instant: action.type === actions.INSTANT_CREATE,
        status //will be undefined if not instant!
      };
      return [...state, newEntry];
    }
    case actions.EXTERNAL_RETURN: {
      const newEntry = { type: "returnexternal", decodings: action.decodings };
      return [...state, newEntry];
    }
    case actions.REVERT: {
      const newEntry = { type: "revert", message: action.message };
      return [...state, newEntry];
    }
    case actions.SELFDESTRUCT: {
      const newEntry = {
        type: "selfdestruct",
        beneficiary: action.beneficiary
      };
      return [...state, newEntry];
    }
    case actions.IDENTIFY_FUNCTION_CALL: {
      const { functionNode, contractNode, variables } = action;
      const newEntry = {
        type: "identify",
        variables,
        functionName: functionNode.name || undefined, //replace "" with undefined
        contractName: contractNode && contractNode.nodeType === "ContractDefinition"
          ? contractNode.name
          : null
      };
      return [...state, newEntry];
    }
    case actions.RESET:
      return state.slice(0, 2); //keep origin and initial call
    case actions.UNLOAD_TRANSACTION:
      return [];
    default:
      return state;
  }
}

const proc = combineReducers({
  transactionLog
});

const reducer = combineReducers({
  proc
});

export default reducer;
