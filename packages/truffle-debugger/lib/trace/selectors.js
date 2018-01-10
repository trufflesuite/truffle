import { createSelector, createStructuredSelector } from "reselect";

const traceStep = (state, props) => props.trace[state.trace.index];

const stepsRemaining = (state, props) =>
  props.trace.length - state.trace.index;

let trace = createStructuredSelector({
  step: traceStep,
  stepsRemaining: stepsRemaining
});
trace.step = traceStep;
trace.stepsRemaining = stepsRemaining;

export default trace;
