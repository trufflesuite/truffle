import { createSelector } from "reselect";
import { createNestedSelector } from "../selectors";

const traceStep = (state, props) => props.trace[state.trace.index];

const stepsRemaining = (state, props) =>
  props.trace.length - state.trace.index;

const steps = (state, props) => [...props.trace];

const index = (state, props) => state.trace.index;

let selector = createNestedSelector({
  index,
  steps,
  stepsRemaining,
  step: traceStep,
});

export default selector;
