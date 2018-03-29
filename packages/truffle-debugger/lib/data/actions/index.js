export const SCOPE = "SCOPE";
export function scope(id, pointer, parentId, sourceId) {
  return {
    type: SCOPE,
    id, pointer, parentId, sourceId
  }
}

export const DECLARE = "DECLARE_VARIABLE";
export function declare(node) {
  return {
    type: DECLARE,
    node
  }
}

export const ASSIGN = "ASSIGN";
export function assign(context, assignments) {
  return {
    type: ASSIGN,
    context, assignments
  };
}
