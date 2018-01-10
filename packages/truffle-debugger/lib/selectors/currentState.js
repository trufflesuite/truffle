import { createStructuredSelector } from "reselect";

import trace from "../trace/selectors";
import solidity from "../solidity/selectors";

let evm = createStructuredSelector({
});

let currentState = createStructuredSelector({
  trace,
  evm,
  solidity: solidity.currentState
});
currentState.trace = trace;
currentState.evm = evm
currentState.solidity = solidity.currentState;

export default currentState;
