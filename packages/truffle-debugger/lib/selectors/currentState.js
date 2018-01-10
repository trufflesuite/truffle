import { createSelector, createStructuredSelector } from "reselect";

import trace from "../trace/selectors";

let evm = createStructuredSelector({
});

const functionDepth = (state, props) => state.solidity.functionDepth;

let solidity = createStructuredSelector({
  functionDepth
});
solidity.functionDepth = functionDepth;


let currentState = createStructuredSelector({
  trace,
  evm,
  solidity
});
currentState.trace = trace;
currentState.evm = evm
currentState.solidity = solidity;

export default currentState;
