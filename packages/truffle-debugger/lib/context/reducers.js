import debugModule from "debug";
const debug = debugModule("debugger:context:reducers");

import assert from "assert";

import { combineReducers } from "redux";

import * as actions from "./actions";

function merge(context, ...others) {
  let {
    binary,
    addresses,
    ast,
    sourceMap,
    source,
    sourcePath,
    contractName
  } = context;

  for (let other of others) {
    addresses = [...new Set([...addresses, ...other.addresses])];

    ast = ast || other.ast;
    sourceMap = sourceMap || other.sourceMap;
    source = source || other.source;
    sourcePath = sourcePath || other.sourcePath;
    contractName = contractName || other.contractName;
  }

  return {
    binary,
    addresses,
    ast,
    sourceMap,
    source,
    sourcePath,
    contractName
  }
}

export function list(state = [], action) {
  switch (action.type) {

    case actions.ADD_CONTEXT:
      return [
        ...state,
        action.context
      ];

    case actions.MERGE_CONTEXT:
      let current = state[action.index];

      return [
        ...state.slice(0, action.index),
        merge(current, action.context),
        ...state.slice(action.index + 1)
      ]

    default:
      return state;
  }
}

export function indexForBinary(state = {}, action) {
  switch (action.type) {

    case actions.ADD_CONTEXT:
      let index = Object.keys(state).length; // new context, new index
      let binary = action.context.binary;
      debug("binary: %o", binary);

      // (just because this is the sort of thing to come back to bite us)
      assert(state[binary] == undefined);

      return {
        ...state,
        [binary]: index
      }

    default:
      return state;
  }
}

export function indexForAddress(state = {_next: 0}, action) {
  switch (action.type) {

    case actions.ADD_CONTEXT:
      let index = state._next;
      debug("adding context to address index: %o", action);

      return {
        ...state,

        // track the # of contexts because this is a separate reducer
        _next: state._next + 1,

        ...Object.assign({},
          ...action.context.addresses.map(
            (address) => ({ [address]: index })
          )
        )
      };

    case actions.MERGE_CONTEXT:
      debug("merging context into address index: %o", action);
      debug("action.context.addresses: %o", action.context.addresses);

      return {
        ...state,

        ...Object.assign({},
          ...action.context.addresses.map(
            (address) => ({ [address]: action.index })
          )
        )
      };

    default:
      return state;
  }

}


const reducer = combineReducers({
  list,
  indexForAddress,
  indexForBinary,
});

export default reducer;
