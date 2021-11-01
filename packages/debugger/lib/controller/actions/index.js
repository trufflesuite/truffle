export const ADVANCE = "CONTROLLER_ADVANCE";
export function advance(count) {
  return { type: ADVANCE, count };
}

export const STEP_NEXT = "CONTROLLER_STEP_NEXT";
export function stepNext() {
  return { type: STEP_NEXT };
}

export const STEP_OVER = "CONTROLLER_STEP_OVER";
export function stepOver() {
  return { type: STEP_OVER };
}

export const STEP_INTO = "CONTROLLER_STEP_INTO";
export function stepInto() {
  return { type: STEP_INTO };
}

export const STEP_OUT = "CONTROLLER_STEP_OUT";
export function stepOut() {
  return { type: STEP_OUT };
}

export const RESET = "CONTROLLER_RESET";
export function reset() {
  return { type: RESET };
}

export const INTERRUPT = "CONTROLLER_INTERRUPT";
export function interrupt() {
  return { type: INTERRUPT };
}

export const RUN_TO_END = "CONTROLLER_RUN_TO_END";
export function runToEnd() {
  return {
    type: RUN_TO_END
  };
}

export const CONTINUE = "CONTROLLER_CONTINUE";
export function continueUntilBreakpoint(breakpoints) {
  //"continue" is not a legal name
  return {
    type: CONTINUE,
    breakpoints
  };
}

export const ADD_BREAKPOINT = "CONTROLLER_ADD_BREAKPOINT";
export function addBreakpoint(breakpoint) {
  return {
    type: ADD_BREAKPOINT,
    breakpoint
  };
}

export const REMOVE_BREAKPOINT = "CONTROLLER_REMOVE_BREAKPOINT";
export function removeBreakpoint(breakpoint) {
  return {
    type: REMOVE_BREAKPOINT,
    breakpoint
  };
}

export const REMOVE_ALL_BREAKPOINTS = "CONTROLLER_REMOVE_ALL_BREAKPOINTS";
export function removeAllBreakpoints() {
  return {
    type: REMOVE_ALL_BREAKPOINTS
  };
}

export const SET_INTERNAL_STEPPING = "CONTROLLER_SET_INTERNAL_STEPPING";
export function setInternalStepping(status) {
  return {
    type: SET_INTERNAL_STEPPING,
    status
  };
}

export const START_STEPPING = "CONTROLLER_START_STEPPING";
export function startStepping() {
  return {
    type: START_STEPPING
  };
}

export const DONE_STEPPING = "CONTROLLER_DONE_STEPPING";
export function doneStepping() {
  return {
    type: DONE_STEPPING
  };
}
