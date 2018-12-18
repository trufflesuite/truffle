export const BEGIN_STEP = "BEGIN_STEP";
export function beginStep(type) {
  return {
    type: BEGIN_STEP,
    stepType: type
  };
}

export const ADVANCE = "ADVANCE";
export function advance() {
  return { type: ADVANCE };
}

export const STEP_NEXT = "STEP_NEXT";
export function stepNext() {
  return { type: STEP_NEXT };
}

export const STEP_OVER = "STEP_OVER";
export function stepOver() {
  return { type: STEP_OVER };
}

export const STEP_INTO = "STEP_INTO";
export function stepInto() {
  return { type: STEP_INTO };
}

export const STEP_OUT = "STEP_OUT";
export function stepOut() {
  return { type: STEP_OUT };
}

export const RESET = "RESET";
export function reset() {
  return { type: RESET };
}

export const INTERRUPT = "INTERRUPT";
export function interrupt() {
  return { type: INTERRUPT };
}

export const CONTINUE = "CONTINUE";
export function continueUntilBreakpoint() {
  //"continue" is not a legal name
  return { type: CONTINUE };
}

export const ADD_BREAKPOINT = "ADD_BREAKPOINT";
export function addBreakpoint(breakpoint) {
  return {
    type: ADD_BREAKPOINT,
    breakpoint
  };
}

export const REMOVE_BREAKPOINT = "REMOVE_BREAKPOINT";
export function removeBreakpoint(breakpoint) {
  return {
    type: REMOVE_BREAKPOINT,
    breakpoint
  };
}

export const REMOVE_ALL_BREAKPOINTS = "REMOVE_ALL_BREAKPOINTS";
export function removeAllBreakpoints() {
  return {
    type: REMOVE_ALL_BREAKPOINTS
  };
}
