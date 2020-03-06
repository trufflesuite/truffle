export const SCOPE = "SCOPE";
export function scope(id, pointer, parentId, sourceId, compilationId) {
  return {
    type: SCOPE,
    id,
    pointer,
    parentId,
    sourceId,
    compilationId
  };
}

export const DECLARE = "DECLARE_VARIABLE";
export function declare(node, compilationId) {
  return {
    type: DECLARE,
    node,
    compilationId
  };
}

export const ASSIGN = "ASSIGN";
export function assign(assignments) {
  return {
    type: ASSIGN,
    assignments
  };
}

export const MAP_PATH_AND_ASSIGN = "MAP_PATH_AND_ASSIGN";
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

export const DEFINE_TYPE = "DEFINE_TYPE";
export function defineType(node, compilationId) {
  return {
    type: DEFINE_TYPE,
    node,
    compilationId
  };
}

export const ALLOCATE = "ALLOCATE";
export function allocate(storage, memory, abi, state) {
  return {
    type: ALLOCATE,
    storage,
    memory,
    abi,
    state
  };
}
