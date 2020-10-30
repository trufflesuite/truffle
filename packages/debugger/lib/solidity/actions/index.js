export const ADD_SOURCES = "SOLIDITY_ADD_SOURCES";
export function addSources(sources) {
  return {
    type: ADD_SOURCES,
    sources
  };
}

export const JUMP = "SOLIDITY_JUMP";
export function jump(jumpDirection) {
  return {
    type: JUMP,
    jumpDirection
  };
}

export const EXTERNAL_CALL = "SOLIDITY_EXTERNAL_CALL";
export function externalCall(guard) {
  return { type: EXTERNAL_CALL, guard };
}

export const EXTERNAL_RETURN = "SOLIDITY_EXTERNAL_RETURN";
export function externalReturn() {
  return { type: EXTERNAL_RETURN };
}

export const CLEAR_PHANTOM_GUARD = "SOLIDITY_CLEAR_PHANTOM_GUARD";
export function clearPhantomGuard() {
  return { type: CLEAR_PHANTOM_GUARD };
}

export const RESET = "SOLIDITY_RESET";
export function reset(guard) {
  return { type: RESET, guard };
}

export const UNLOAD_TRANSACTION = "SOLIDITY_UNLOAD_TRANSACTION";
export function unloadTransaction() {
  return { type: UNLOAD_TRANSACTION };
}
