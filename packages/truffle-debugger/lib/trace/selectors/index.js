import { createSelectorTree, createLeaf } from "reselect-tree";

let trace = createSelectorTree({
  /**
   * trace.index
   *
   * current step index
   */
  index: state => state.trace.proc.index,

  /**
   * trace.finished
   *
   * is the trace finished?
   */
  finished: state => state.trace.proc.finished,

  /**
   * trace.steps
   *
   * all trace steps
   */
  steps: state => state.trace.info.steps,

  /**
   * trace.stepsRemaining
   *
   * number of steps remaining in trace
   */
  stepsRemaining: createLeaf(
    ["./steps", "./index"],
    (steps, index) => steps.length - index
  ),

  /**
   * trace.step
   *
   * current trace step
   */
  step: createLeaf(["./steps", "./index"], (steps, index) => steps[index]),

  /**
   * trace.next
   *
   * next trace step
   * HACK: if at the end,
   * we will return the *same* trace step
   */
  next: createLeaf(
    ["./steps", "./index"],
    (steps, index) =>
      index < steps.length - 1 ? steps[index + 1] : steps[index]
  ),

  /*
   * trace.nextOfSameDepth
   * next trace step that's at the same depth as this one
   * NOTE: if there is none, will return undefined
   * (should not be used in such cases)
   */
  nextOfSameDepth: createLeaf(["./steps", "./index"], (steps, index) => {
    let depth = steps[index].depth;
    return steps.slice(index + 1).find(step => step.depth === depth);
  })
});

export default trace;
