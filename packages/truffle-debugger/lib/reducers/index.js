import { combineReducers } from "redux";

import callstack from "./callstack";
import functionDepth from './functionDepth';
import trace from "../trace/reducers";

export const reduceState = combineReducers({
  trace,

  evm: combineReducers({
    callstack: callstack
  }),

  solidity: combineReducers({
    functionDepth: functionDepth,
  }),

});

export default function reduce(session, action) {
  return {
    props: session.props,
    state: reduceState(session.state, action)
  }
}
