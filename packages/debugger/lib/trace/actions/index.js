export const SAVE_STEPS = "SAVE_STEPS";
export function saveSteps(steps) {
  return {
    type: SAVE_STEPS,
    steps
  };
}

export const NEXT = "NEXT";
export function next() {
  return { type: NEXT };
}

export const TICK = "TICK";
export function tick() {
  return { type: TICK };
}

export const TOCK = "TOCK";
export function tock() {
  return { type: TOCK };
}

export const END_OF_TRACE = "EOT";
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

export const BACKTICK = "BACKTICK";
export function backtick() {
  return { type: BACKTICK };
}
