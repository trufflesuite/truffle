import { createSelectorTree, createLeaf } from "reselect-tree";

const PAST_END_OF_TRACE = {
  depth: -1, //this is the part that matters!
  //the rest of this is just to look like a trace step
  error: "",
  gas: 0,
  memory: [],
  stack: [],
  storage: {},
  gasCost: 0,
  op: "STOP",
  pc: -1 //this is not at all valid but that's fine
};

let trace = createSelectorTree({
  /**
   * trace.index
   *
   * current step index
   */
  index: state => state.trace.proc.index,

  /**
   * trace.loaded
   * is a trace loaded?
   */
  loaded: createLeaf(["/steps"], steps => steps !== null),

  /**
   * trace.finished
   * is the trace finished?
   */
  finished: state => state.trace.proc.finished,

  /**
   * trace.finishedOrUnloaded
   *
   * is the trace finished, including if it's unloaded?
   */
  finishedOrUnloaded: createLeaf(
    ["/finished", "/loaded"],
    (finished, loaded) => finished || !loaded
  ),

  /**
   * trace.steps
   *
   * all trace steps
   */
  steps: state => state.trace.transaction.steps,

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
   * HACK: if no steps,
   * we will return a spoofed "past end" step
   */
  step: createLeaf(
    ["./steps", "./index"],
    (steps, index) =>
      steps ? (steps.length > 0 ? steps[index] : PAST_END_OF_TRACE) : null //null if no tx loaded
  ),

  /**
   * trace.next
   *
   * next trace step
   * HACK: if at the end,
   * we will return a spoofed "past end" step
   */
  next: createLeaf(["./steps", "./index"], (steps, index) =>
    index < steps.length - 1 ? steps[index + 1] : PAST_END_OF_TRACE
  ),

  /**
   * trace.nextOfSameDepth
   * next trace step that's at the same depth as this one
   * NOTE: if there is none, will return undefined
   * (should not be used in such cases)
   * NOTE: for additional correctness, will stop searching once
   * it hits something of *lower* depth (yes that makes the name
   * a little misleading, but the idea is to find the return step
   * for a given call step)
   */
  nextOfSameDepth: createLeaf(["./steps", "./index"], (steps, index) => {
    let depth = steps[index].depth;
    for (let step of steps.slice(index + 1)) {
      //start searching after current step
      //using a manual for loop here instead of .find in order to
      //cut off the search early if needed
      if (step.depth === depth) {
        return step;
      }
      if (step.depth < depth) {
        return undefined;
      }
    }
    return undefined;
  }),

  /**
   * trace.application
   */
  application: {
    /**
     * trace.application.submoduleCount
     */
    submoduleCount: state => state.trace.application.submoduleCount
  }
});

export default trace;
