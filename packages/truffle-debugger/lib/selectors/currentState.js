import { createStructuredSelector } from "reselect";

import trace from "../trace/selectors";
import solidity from "../solidity/selectors";

let evm = createStructuredSelector({
});

let currentState = createStructuredSelector({
  trace,
  evm,
  solidity
});
currentState.trace = trace;
currentState.evm = evm
currentState.solidity = solidity;

export default currentState;
