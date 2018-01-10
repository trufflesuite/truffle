import { createStructuredSelector } from "reselect";

const functionDepth = (state, props) => state.solidity.functionDepth;

let currentState = createStructuredSelector({
  functionDepth
});
currentState.functionDepth = functionDepth;

let solidity = createStructuredSelector({
  currentState
});
solidity.currentState = currentState;

export default solidity;
