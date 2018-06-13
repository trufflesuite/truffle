export const VISIT = "VISIT";
export function visit(sourceId, ast) {
  return {
    type: VISIT,
    sourceId, ast
  }
}

export const DONE_VISITING = "DONE_VISITING";
export function doneVisiting() {
  return {
    type: DONE_VISITING
  };
}
