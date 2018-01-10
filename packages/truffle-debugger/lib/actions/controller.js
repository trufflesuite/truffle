export const TICK = "TICK";
export function tick() {
  return {type: TICK};
}

export const TOCK = "TOCK";
export function tock() {
  return {type: TOCK};
}

export const END_OF_TRACE = "EOT";
export function endTrace() {
  return {type: END_OF_TRACE};
}

export const BEGIN_STEP = "BEGIN_STEP";
export function beginStep(type) {
  return {
    type: BEGIN_STEP,
    stepType: type
  };
}

export const STEP_NEXT = "STEP_NEXT";
export function stepNext() {
  return {type: STEP_NEXT};
}

export const STEP_OVER = "STEP_OVER";
export function stepOver() {
  return {type: STEP_OVER};
}

export const STEP_INTO = "STEP_INTO";
export function stepInto() {
  return {type: STEP_INTO};
}

export const STEP_OUT = "STEP_OUT";
export function stepOut() {
  return {type: STEP_OUT};
}

export const INTERRUPT = "INTERRUPT";
export function interrupt () {
  return {type: INTERRUPT};
}


