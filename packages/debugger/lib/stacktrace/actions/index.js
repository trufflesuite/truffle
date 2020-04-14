export const JUMP_IN = "STACKTRACE_JUMP_IN";
export function jumpIn(from, functionNode) {
  return {
    type: JUMP_IN,
    from,
    functionNode
  };
}

export const JUMP_OUT = "STACKTRACE_JUMP_OUT";
export function jumpOut() {
  return {
    type: JUMP_OUT
  };
}

export const EXTERNAL_CALL = "STACKTRACE_EXTERNAL_CALL";
export function externalCall(from, skippedInReports) {
  return {
    type: EXTERNAL_CALL,
    from,
    skippedInReports
  };
}

export const EXTERNAL_RETURN = "STACKTRACE_EXTERNAL_RETURN";
export function externalReturn(from, status) {
  return {
    type: EXTERNAL_RETURN,
    from,
    status
  };
}

export const EXECUTE_RETURN = "EXECUTE_RETURN";
export function executeReturn(counter) {
  return {
    type: EXECUTE_RETURN,
    counter
  };
}

export const MARK_RETURN_POSITION = "MARK_RETURN_POSITION";
export function markReturnPosition(location) {
  return {
    type: MARK_RETURN_POSITION,
    location
  };
}

//note: no reducer explicitly listens for this, but justReturned depends on it
export const CLEAR_RETURN_MARKER = "CLEAR_RETURN_MARKER";
export function clearReturnMarker() {
  return {
    type: CLEAR_RETURN_MARKER
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
