export const ASSIGN_STORAGE = "ASSIGN_STORAGE";
export function assignStorage(binary, variable, value) {
  return {
    type: ASSIGN_STORAGE,
    binary,
    variable,
    value
  };
}
