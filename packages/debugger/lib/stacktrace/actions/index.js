export const JUMP_IN = "STACKTRACE_JUMP_IN";
export function jumpIn(location, functionNode, contractNode, sourceIsInternal) {
  return {
    type: JUMP_IN,
    location,
    functionNode,
    contractNode,
    sourceIsInternal
  };
}

export const JUMP_OUT = "STACKTRACE_JUMP_OUT";
export function jumpOut(location) {
  return {
    type: JUMP_OUT,
    location
  };
}

export const EXTERNAL_CALL = "STACKTRACE_EXTERNAL_CALL";
export function externalCall(
  location,
  context,
  address,
  combineWithNextInternal
) {
  return {
    type: EXTERNAL_CALL,
    location,
    context,
    address,
    combineWithNextInternal
  };
}

export const EXTERNAL_RETURN = "STACKTRACE_EXTERNAL_RETURN";
export function externalReturn(from, status, location, index) {
  return {
    type: EXTERNAL_RETURN,
    from,
    status,
    location,
    index
  };
}

export const EXECUTE_RETURN = "STACKTRACE_EXECUTE_RETURN";
export function executeReturn(counter, location) {
  return {
    type: EXECUTE_RETURN,
    counter,
    location
  };
}

export const UPDATE_POSITION = "STACKTRACE_UPDATE_POSITION";
export function updatePosition(location) {
  return {
    type: UPDATE_POSITION,
    location
  };
}

export const RESET = "STACKTRACE_RESET";
export function reset() {
  return {
    type: RESET
  };
}

export const UNLOAD_TRANSACTION = "STACKTRACE_UNLOAD_TRANSACTION";
export function unloadTransaction() {
  return {
    type: UNLOAD_TRANSACTION
  };
}
