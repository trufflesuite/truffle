import { combineReducers } from "redux";

import callstack from "./callstack";
import functionDepth from './functionDepth';
import trace from "../trace/reducers";


export const reduceState = combineReducers({
  evm: combineReducers({
    callstack: callstack,
    traceIndex: trace,
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
