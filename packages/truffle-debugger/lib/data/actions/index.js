export const SCOPE = "SCOPE";
export function scope(id, pointer, parentId, sourceId) {
  return {
    type: SCOPE,
    id,
    pointer,
    parentId,
    sourceId
  };
}

export const DECLARE = "DECLARE_VARIABLE";
export function declare(node) {
  return {
    type: DECLARE,
    node
  };
}

export const ASSIGN = "ASSIGN";
export function assign(context, assignments) {
  return {
    type: ASSIGN,
    context,
    assignments
  };
}

export const MAP_KEY = "MAP_KEY";
export function mapKey(id, key) {
  return {
    type: MAP_KEY,
    id,
    key
  };
}

export const RESET = "DATA_RESET";
export function reset() {
  return { type: RESET };
}
