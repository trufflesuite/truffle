export const ADD_CONTEXT = "EVM_ADD_CONTEXT";
export function addContext(contractName, raw, compiler) {
  return {
    type: ADD_CONTEXT,
    contractName,
    raw,
    compiler
  };
}

export const ADD_BINARY = "EVM_ADD_BINARY";
export function addBinary(context, binary) {
  return {
    type: ADD_BINARY,
    context,
    binary
  };
}

export const ADD_INSTANCE = "EVM_ADD_INSTANCE";
export function addInstance(address, context, binary) {
  return {
    type: ADD_INSTANCE,
    address,
    context,
    binary
  };
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
  };
}

export const RESET = "EVM_RESET";
export function reset() {
  return { type: RESET };
}
