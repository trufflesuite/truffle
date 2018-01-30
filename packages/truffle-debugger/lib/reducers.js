import { combineReducers } from "redux";

import context from "./context/reducers";
import evm from "./evm/reducers";
import solidity from './solidity/reducers';
import trace from "./trace/reducers";

const reduceState = combineReducers({
  context,
  evm,
  solidity,
  trace,
});

export default function reduce(session, action) {
  return {
    props: session.props,
    state: reduceState(session.state, action)
  }
}
