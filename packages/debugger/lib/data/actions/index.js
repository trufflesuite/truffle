export const SCOPE = "DATA_SCOPE";
export function scope(id, pointer, parentId, sourceIndex, sourceId) {
  return {
    type: SCOPE,
    id,
    pointer,
    parentId,
    sourceIndex,
    sourceId
  };
}

export const DECLARE = "DATA_DECLARE_VARIABLE";
export function declare(name, astRef, scopeAstRef, sourceId) {
  return {
    type: DECLARE,
    name,
    astRef,
    scopeAstRef,
    sourceId
  };
}

export const ASSIGN = "DATA_ASSIGN";
export function assign(assignments) {
  return {
    type: ASSIGN,
    assignments
  };
}

export const MAP_PATH_AND_ASSIGN = "DATA_MAP_PATH_AND_ASSIGN";
export function mapPathAndAssign(
  address,
  slot,
  assignments,
  typeIdentifier,
  parentType
) {
  return {
    type: MAP_PATH_AND_ASSIGN,
    address,
    slot,
    assignments,
    typeIdentifier,
    parentType
  };
}

export const RESET = "DATA_RESET";
export function reset() {
  return { type: RESET };
}

export const DEFINE_TYPE = "DATA_DEFINE_TYPE";
export function defineType(node, sourceId) {
  return {
    type: DEFINE_TYPE,
    node,
    sourceId
  };
}

export const DEFINE_TAGGED_OUTPUT = "DATA_DEFINE_TAGGED_OUTPUT";
export function defineTaggedOutput(node, sourceId) {
  return {
    type: DEFINE_TAGGED_OUTPUT,
    node,
    sourceId
  };
}

export const ALLOCATE = "DATA_ALLOCATE";
export function allocate(storage, memory, abi, calldata, returndata, state) {
  return {
    type: ALLOCATE,
    storage,
    memory,
    abi,
    calldata,
    returndata,
    state
  };
}
