import { createSelector, createStructuredSelector } from "reselect";

const traceStep = (state, props) => props.trace[state.evm.traceIndex];

const stepsRemaining = (state, props) =>
  props.trace.length - state.evm.traceIndex;

let trace = createStructuredSelector({
  step: traceStep,
  stepsRemaining: stepsRemaining
});
trace.step = traceStep;
trace.stepsRemaining = stepsRemaining;

export default trace;
