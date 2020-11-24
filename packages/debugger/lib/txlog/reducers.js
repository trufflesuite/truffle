import debugModule from "debug";
const debug = debugModule("debugger:txlog:reducers");

import {combineReducers} from "redux";

import * as actions from "./actions";

//NOTE: even though we refer to nodes by JSON pointer,
//these pointers are "fake" in that we don't actually
//use them *as* JSON pointers; it's just a convenient
//method of IDing them that also has a nice intuitive
//meaning (you'll notice we don't actually import
//json-pointer here or anywhere else in this submodule)
const DEFAULT_TX_LOG = {
  byPointer: {
    "": {
      // "" is the root node
      type: "transaction",
      actions: []
    }
  }
};

function transactionLog(state = DEFAULT_TX_LOG, action) {
  const {pointer, newPointer} = action;
  const node = state.byPointer[pointer];
  switch (action.type) {
    case actions.RECORD_ORIGIN:
      if (node.type === "transaction") {
        return {
          byPointer: {
            ...state.byPointer,
            [pointer]: {
              ...node,
              origin: action.address
            }
          }
        };
      } else {
        debug("attempt to set origin of bad node type!");
        return state;
      }
    case actions.INTERNAL_CALL:
      return {
        byPointer: {
          ...state.byPointer,
          [pointer]: {
            ...node,
            actions: [...node.actions, newPointer]
          },
          [newPointer]: {
            type: "callinternal",
            actions: [],
            waitingForFunctionDefinition: true
          }
        }
      };
    case actions.ABSORBED_CALL:
      return {
        byPointer: {
          ...state.byPointer,
          [pointer]: {
            ...node,
            absorbNextInternalCall: false
          }
        }
      };
    case actions.INTERNAL_RETURN:
      //pop the top call from the stack if it's internal (and set its return values)
      //if the top call is instead external, just set its return values if appropriate.
      //(this is how we handle internal/external return absorption)
      const modifiedNode = {...node};
      if (modifiedNode.type === "callinternal") {
        modifiedNode.returnKind = "return";
        modifiedNode.returnValues = action.variables;
        delete modifiedNode.waitingForFunctionDefinition;
      } else if (modifiedNode.type === "callexternal") {
        if (modifiedNode.kind === "function") {
          //don't set return variables for non-function external calls
          modifiedNode.returnValues = action.variables;
        }
      } else {
        debug("returninternal once tx done!");
      }
      return {
        byPointer: {
          ...state.byPointer,
          [pointer]: modifiedNode
        }
      };
    case actions.INSTANT_EXTERNAL_CALL:
    case actions.EXTERNAL_CALL:
    case actions.INSTANT_CREATE:
    case actions.CREATE: {
      const instant =
        action.type === actions.INSTANT_EXTERNAL_CALL ||
        action.type === actions.INSTANT_CREATE;
      let modifiedNode = {
        ...node,
        actions: [...node.actions, newPointer]
      };
      if (
        modifiedNode.type === "callexternal" &&
        modifiedNode.kind === "library"
      ) {
        //didn't identify it as function, so set it to message
        modifiedNode.kind = "message";
      }
      const {
        address,
        binary, //only for creates
        context,
        value,
        salt, //only for creates
        isDelegate,
        decoding,
        calldata,
        status
      } = action;
      let kind;
      if (
        action.type === actions.CREATE ||
        action.type === actions.INSTANT_CREATE
      ) {
        //these don't have kind in the action, so we instead determine
        //it this way
        kind = context ? "constructor" : "unknowncreate";
      } else {
        kind = action.kind;
      }
      const contractName = context ? context.contractName : undefined;
      let functionName, variables;
      if (decoding.kind === "function" || decoding.kind === "constructor") {
        functionName = decoding.abi.name;
        variables = decoding.arguments;
      }
      let call = {
        type: "callexternal",
        address,
        contextHash: context.context || null,
        value,
        kind,
        isDelegate,
        functionName,
        contractName,
        arguments: variables,
        actions: []
      };
      if (kind === "message" || kind === "library") {
        call.data = calldata;
      } else if (kind === "unknowncreate") {
        call.binary = binary;
      }
      if (kind === "constructor" || kind === "unknowncreate") {
        call.salt = salt;
      }
      if (instant) {
        call.returnKind = status ? "return" : "revert";
      } else {
        //If kind === "message", set waiting to false.
        //Why?  Well, because fallback functions and receive functions
        //typically have their function definitions skipped over, so the next
        //one we hit would instead be a function *called* from the fallback
        //function, which is not what we want.
        call.waitingForFunctionDefinition = kind !== "message";
        //if kind is message or constructor, we don't want to absorb.
        call.absorbNextInternalCall =
          (kind === "function" || kind === "library") &&
          action.absorbNextInternalCall;
      }
      return {
        byPointer: {
          ...state.byPointer,
          [pointer]: modifiedNode,
          [newPointer]: call
        }
      };
    }
    case actions.EXTERNAL_RETURN:
    case actions.REVERT:
    case actions.SELFDESTRUCT: {
      //first: set the returnKind and other info
      let modifiedNode = {...node};
      if (
        modifiedNode.type === "callexternal" &&
        modifiedNode.kind === "library"
      ) {
        //didn't identify it as function, so set it to message
        modifiedNode.kind = "message";
      }
      switch (action.type) {
        case actions.EXTERNAL_RETURN:
          if (!modifiedNode.returnKind) {
            modifiedNode.returnKind = "return";
          }
          break;
        case actions.REVERT:
          modifiedNode.returnKind = "revert";
          modifiedNode.error = action.error;
          break;
        case actions.SELFDESTRUCT:
          modifiedNode.returnKind = "selfdestruct";
          modifiedNode.beneficiary = action.beneficiary;
          break;
      }
      let newState = {
        byPointer: {
          ...state.byPointer,
          [pointer]: modifiedNode
        }
      };
      //now: pop all calls from stack until we pop an external call.
      //we don't handle return values here since those are handled
      //in returninternal (yay absorption)
      let currentPointer;
      for (
        currentPointer = pointer;
        currentPointer.replace(/\/actions\/\d+$/, "") !== newPointer; //stop *before* the stop pointer
        currentPointer = currentPointer.replace(/\/actions\/\d+$/, "") //cut off end
      ) {
        debug("currentNode!");
        let currentNode = {...newState.byPointer[currentPointer]}; //clone
        if (!currentNode.returnKind) {
          //set the return kind on any nodes popped along the way that don't have
          //one already to note that they failed to return due to a call they made
          //reverting
          currentNode.returnKind = "unwind";
        }
        delete currentNode.waitingForFunctionDefinition;
        debug("set currentNode!");
        newState.byPointer[currentPointer] = currentNode;
      }
      //now handle the external call.
      //note that currentPointer now points to it.
      debug("finalNode!");
      let finalNode = {...newState.byPointer[currentPointer]}; //clone
      //first let's set the returnKind if there isn't one already
      //(in which case we can infer it was unwound).
      if (!finalNode.returnKind) {
        finalNode.returnKind = "unwind";
      }
      //now let's set its return variables if applicable.
      if (
        finalNode.kind === "function" &&
        action.type === actions.EXTERNAL_RETURN &&
        action.decodings
      ) {
        const decoding = action.decodings.find(
          decoding => decoding.kind === "return"
        );
        if (decoding) {
          //we'll trust this method over the method resulting from an internal return,
          //*if* it produces a valid return-value decoding.  if it doesn't, we ignore it.
          finalNode.returnValues = decoding.arguments;
        }
      }
      //also, set immutables if applicable -- note that we do *not* attempt to set
      //these the internal way, as we don't have a reliable way of doing that
      if (
        finalNode.kind === "constructor" &&
        action.type === actions.EXTERNAL_RETURN &&
        action.decodings
      ) {
        const decoding = action.decodings.find(
          decoding => decoding.kind === "bytecode"
        );
        if (decoding && decoding.immutables) {
          finalNode.returnImmutables = decoding.immutables;
        }
      }
      //finally, delete internal info
      delete finalNode.waitingForFunctionDefinition;
      delete finalNode.absorbNextInternalCall;
      debug("set finalNode!");
      newState.byPointer[currentPointer] = finalNode;
      return newState;
    }
    case actions.IDENTIFY_FUNCTION_CALL: {
      const {functionNode, contractNode, variables} = action;
      const functionName = functionNode.name || undefined; //replace "" with undefined
      const contractName =
        contractNode && contractNode.nodeType === "ContractDefinition"
          ? contractNode.name
          : null;
      let modifiedNode = {
        ...node,
        waitingForFunctionDefinition: false
      };
      //note: I don't handle the following in the object spread above
      //because I don't want undefined or null counting against it
      if (!modifiedNode.functionName) {
        modifiedNode.functionName = functionName;
      }
      if (!modifiedNode.contractName) {
        modifiedNode.contractName = contractName;
      }
      if (!modifiedNode.arguments) {
        modifiedNode.arguments = variables;
      }
      if (
        modifiedNode.type === "callexternal" &&
        modifiedNode.kind === "library"
      ) {
        modifiedNode.kind = "function";
        delete modifiedNode.data;
      }
      return {
        byPointer: {
          ...state.byPointer,
          [pointer]: modifiedNode
        }
      };
    }
    case actions.UNLOAD_TRANSACTION:
      return DEFAULT_TX_LOG;
    default:
      return state;
  }
}

function currentNodePointer(state = "", action) {
  switch (action.type) {
    case actions.INTERNAL_CALL:
    case actions.EXTERNAL_CALL:
    case actions.CREATE:
    case actions.INTERNAL_RETURN:
    case actions.EXTERNAL_RETURN:
    case actions.REVERT:
    case actions.SELFDESTRUCT:
      //note that instant calls/creates are not included!
      return action.newPointer;
    case actions.RESET:
      return "/actions/0"; //reset to status after initial call
    case actions.UNLOAD_TRANSACTION:
      return "";
    default:
      return state;
  }
}

//this is a stack of the pointers to external calls.
//note: not to the frames below them!
function pointerStack(state = [], action) {
  switch (action.type) {
    case actions.EXTERNAL_CALL:
    case actions.CREATE:
      //note that instant calls & creates are not included!
      return [...state, action.newPointer];
    case actions.EXTERNAL_RETURN:
    case actions.REVERT:
    case actions.SELFDESTRUCT:
      return state.slice(0, -1);
    case actions.RESET:
      return ["/actions/0"]; //reset to status after initial call
    case actions.UNLOAD_TRANSACTION:
      return [];
    default:
      return state;
  }
}

const proc = combineReducers({
  transactionLog,
  currentNodePointer,
  pointerStack
});

const reducer = combineReducers({
  proc
});

export default reducer;
