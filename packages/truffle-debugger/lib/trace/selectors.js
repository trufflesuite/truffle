import { createSelector, createStructuredSelector } from "reselect";

const traceStep = (state, props) => props.trace[state.trace.index];

const stepsRemaining = (state, props) =>
  props.trace.length - state.trace.index;

let selector = createStructuredSelector({
  step: traceStep,
  stepsRemaining: stepsRemaining
});
selector.step = traceStep;
selector.stepsRemaining = stepsRemaining;

export default selector;
