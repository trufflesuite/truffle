import { combineReducers } from "redux";


import evm from "../evm/reducers";
import solidity from '../solidity/reducers';
import trace from "../trace/reducers";

export const reduceState = combineReducers({
  trace,
  evm,
  solidity
});

export default function reduce(session, action) {
  return {
    props: session.props,
    state: reduceState(session.state, action)
  }
}
