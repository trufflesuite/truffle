export const SAVE_STEPS = "TRACE_SAVE_STEPS";
export function saveSteps(steps) {
  return {
    type: SAVE_STEPS,
    steps
  };
}

export const NEXT = "TRACE_NEXT";
export function next() {
  return { type: NEXT };
}

export const TICK = "TRACE_TICK";
export function tick() {
  return { type: TICK };
}

export const TOCK = "TRACE_TOCK";
export function tock() {
  return { type: TOCK };
}

export const END_OF_TRACE = "TRACE_EOT";
export function endTrace() {
  return { type: END_OF_TRACE };
}

export const RESET = "TRACE_RESET";
export function reset() {
  return { type: RESET };
}

export const UNLOAD_TRANSACTION = "TRACE_UNLOAD_TRANSACTION";
export function unloadTransaction() {
  return { type: UNLOAD_TRANSACTION };
}

export const BACKTICK = "TRACE_BACKTICK";
export function backtick() {
  return { type: BACKTICK };
}

export const SET_SUBMODULE_COUNT = "TRACE_SET_SUBMODULE_COUNT";
export function setSubmoduleCount(count) {
  return { type: SET_SUBMODULE_COUNT, count };
}
