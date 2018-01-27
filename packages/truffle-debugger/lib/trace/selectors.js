import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";

const traceStep = (state, props) => state.trace.steps[state.trace.index];

const stepsRemaining = (state, props) =>
  state.trace.steps.length - state.trace.index;

const steps = (state, props) => [...state.trace.steps];

const index = (state, props) => state.trace.index;

let selector = createNestedSelector({
  index,
  steps,
  stepsRemaining,
  step: traceStep,
});

export default selector;
