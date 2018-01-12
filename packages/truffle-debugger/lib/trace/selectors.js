import { createSelector, createStructuredSelector } from "reselect";

const traceStep = (state, props) => props.trace[state.trace.index];

const stepsRemaining = (state, props) =>
  props.trace.length - state.trace.index;

const steps = (state, props) => [...props.trace];

let selector = createStructuredSelector({
  steps,
  stepsRemaining,
  step: traceStep,
});
selector.steps = steps;
selector.step = traceStep;
selector.stepsRemaining = stepsRemaining;

export default selector;
