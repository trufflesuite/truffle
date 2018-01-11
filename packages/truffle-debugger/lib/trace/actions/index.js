export const NEXT = "NEXT";
export function next() {
  return {type: NEXT};
}

export const WENT_NEXT = "WENT_NEXT";
export function wentNext() {
  return {type: WENT_NEXT};
}


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
