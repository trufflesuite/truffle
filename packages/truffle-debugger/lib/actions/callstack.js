export const CALL = "CALL";
export function call(address) {
  return {
    type: CALL,
    address
  };
}

export const CREATE = "CREATE";
export function create(binary) {
  return {
    type: CREATE,
    binary
  };
}

export const RETURN = "RETURN";
export function returnCall() {
  return {
    type: RETURN
  }
}
