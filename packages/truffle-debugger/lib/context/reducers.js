import assert from "assert";

import { combineReducers } from "redux";

import * as actions from "./actions";

function merge(context, others...) {
  let {
    binary,
    addresses,
    sourceMap,
    source,
    sourcePath,
    contractName
  } = context;

  for (let other of others) {
    addresses = new Set([...addresses, ...other.addresses]);

    sourceMap = sourceMap || other.sourceMap;
    source = source || other.source;
    sourcePath = sourcePath || other.sourcePath;
    contractName = contractName || other.contractName;
  }

  return {
    binary,
    addresses,
    sourceMap,
    source,
    sourcePath,
    contractName
  }
}

export function list(state = [], action) {
  switch (action.type) {

    actions.ADD_CONTEXT:
      return [
        ...state,
        action.context
      ];

    actions.MERGE_CONTEXT:
      let current = state[i];

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

    actions.ADD_CONTEXT:
      let index = Object.keys(state).length; // new context, new index

      // (just because this is the sort of thing to come back to bite us)
      assert(state[context.binary] == undefined);

      return {
        ...state,
        [context.binary]: index
      }

    default:
      return state;
  }
}

export function indexForAddress(state = {_next: 0}, action) {
  switch (action.type) {

    actions.ADD_CONTEXT:
      let index = state._next;

      return {
        ...state,

        // track the # of contexts because this is a separate reducer
        _next: state._next + 1,

        ...action.context.addresses.map(
          (address) => ({ [address]: index })
        )
      };

    actions.MERGE_CONTEXT:
      return {
        ...state,

        ...action.context.addresses.map(
          (address) => ({ [address]: action.index })
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
