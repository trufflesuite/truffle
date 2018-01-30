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

export default reduceState;
