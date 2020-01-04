export const ADD_SOURCE = "SOLIDITY_ADD_SOURCE";
export function addSource(source, sourcePath, ast, compiler) {
  return {
    type: ADD_SOURCE,
    source,
    sourcePath,
    ast,
    compiler
  };
}

export const JUMP = "JUMP";
export function jump(jumpDirection) {
  return {
    type: JUMP,
    jumpDirection
  };
}

export const EXTERNAL_CALL = "EXTERNAL_CALL";
export function externalCall(guard) {
  return { type: EXTERNAL_CALL, guard };
}

export const EXTERNAL_RETURN = "EXTERNAL_RETURN";
export function externalReturn() {
  return { type: EXTERNAL_RETURN };
}

export const CLEAR_PHANTOM_GUARD = "CLEAR_PHANTOM_GUARD";
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
