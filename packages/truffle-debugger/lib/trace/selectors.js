import { createSelector, createStructuredSelector } from "reselect";

const traceStep = (state, props) => props.trace[state.trace.index];

const stepsRemaining = (state, props) =>
  props.trace.length - state.trace.index;

const steps = (state, props) => [...props.trace];

const index = (state, props) => state.trace.index;

let selector = createStructuredSelector({
  index,
  steps,
  stepsRemaining,
  step: traceStep,
});
selector.index = index;
selector.steps = steps;
selector.step = traceStep;
selector.stepsRemaining = stepsRemaining;

export default selector;
