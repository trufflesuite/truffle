export const VISIT = "VISIT";
export function visit(context, ast) {
  return {
    type: VISIT,
    context, ast
  }
}

export const ENTER = "NODE_ENTER";
export function enter(pointer, node, context, parentId) {
  return {
    type: ENTER,
    pointer, node, context, parentId
  };
}

export const EXIT = "NODE_EXIT";
export function exit(pointer, node, context) {
  return {
    type: EXIT,
    pointer, node, context
  };
}
