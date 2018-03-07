export const VISIT = "VISIT";
export function visit(context, ast) {
  return {
    type: VISIT,
    context, ast
  }
}

export const DONE_VISITING = "DONE_VISITING";
export function doneVisiting() {
  return {
    type: DONE_VISITING
  };
}
