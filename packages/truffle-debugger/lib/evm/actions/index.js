export const ADD_CONTEXT = "EVM_ADD_CONTEXT";
export function addContext(binary) {
  return {
    type: ADD_CONTEXT,
    binary
  }
}

export const ADD_INSTANCE = "EVM_ADD_INSTANCE";
export function addInstance(address, binary) {
  return {
    type: ADD_INSTANCE,
    address, binary
  }
}

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
