import { createSelectorTree, createLeaf } from "lib/selectors";

let trace = createSelectorTree({
  /**
   * trace.index
   *
   * current step index
   */
  index: (state) => state.trace.index,

  /**
   * trace.steps
   *
   * all trace steps
   */
  steps: (state) => state.trace.steps,

  /**
   * trace.stepsRemaining
   *
   * number of steps remaining in trace
   */
  stepsRemaining: createLeaf(
    ["./steps", "./index"], (steps, index) => steps.length - index
  ),

  /**
   * trace.step
   *
   * current trace step
   */
  step: createLeaf(
    ["./steps", "./index"], (steps, index) => steps[index]
  )
});

export default trace;
