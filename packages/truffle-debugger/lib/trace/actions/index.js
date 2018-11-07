export const SAVE_STEPS = "SAVE_STEPS";
export function saveSteps(steps) {
  return {
    type: SAVE_STEPS,
    steps
  };
}

export const RECEIVE_ADDRESSES = "RECEIVE_ADDRESSES";
export function receiveAddresses(addresses) {
  return {
    type: RECEIVE_ADDRESSES,
    addresses
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
