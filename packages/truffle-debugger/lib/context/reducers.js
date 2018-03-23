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

export default function reducer(state = [], action) {
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
