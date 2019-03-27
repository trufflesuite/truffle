export const ADD_SOURCE = "SOLIDITY_ADD_SOURCE";
export function addSource(source, sourcePath, ast) {
  return {
    type: ADD_SOURCE,
    source,
    sourcePath,
    ast
  };
}

export const ADD_SOURCEMAP = "SOLIDITY_ADD_SOURCEMAP";
export function addSourceMap(binary, sourceMap) {
  return {
    type: ADD_SOURCEMAP,
    binary,
    sourceMap
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
export function externalCall() {
  return { type: EXTERNAL_CALL };
}

export const EXTERNAL_RETURN = "EXTERNAL_RETURN";
export function externalReturn() {
  return { type: EXTERNAL_RETURN };
}

export const RESET = "SOLIDITY_RESET";
export function reset() {
  return { type: RESET };
}
