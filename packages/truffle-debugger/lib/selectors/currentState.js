import { createSelector, createStructuredSelector } from "reselect";

export const traceStep = (state, props) => props.trace[state.evm.traceIndex];

const stepsRemaining = (state, props) =>
  props.trace.length - state.evm.traceIndex;

let trace = createStructuredSelector({
  step: traceStep,
  stepsRemaining: stepsRemaining
});
trace.step = traceStep;
trace.stepsRemaining = stepsRemaining;

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
