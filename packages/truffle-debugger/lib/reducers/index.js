// import traceIndex from './traceIndex';
// import callstack from './callstack';
import { combineReducers } from "redux";

import callstack from "./callstack";
import functionDepth from './functionDepth';
import traceIndex from "./traceIndex";


export const reduceState = combineReducers({
  evm: combineReducers({
    callstack: callstack,
    traceIndex: traceIndex,
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
