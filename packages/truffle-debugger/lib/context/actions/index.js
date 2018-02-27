export const ADD_CONTEXT = "ADD_CONTEXT";
export function addContext(context) {
  return {
    type: ADD_CONTEXT,
    context
  }
}

export const MERGE_CONTEXT = "MERGE_CONTEXT";
export function mergeContext(index, context) {
  return {
    type: MERGE_CONTEXT,
    index,
    context
  }
}
