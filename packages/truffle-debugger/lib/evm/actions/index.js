export const ADD_CONTEXT = "EVM_ADD_CONTEXT";
export function addContext(contractName, raw, compiler, contractId) {
  return {
    type: ADD_CONTEXT,
    contractName,
    raw,
    compiler,
    contractId
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

export const SAVE_GLOBALS = "SAVE_GLOBALS";
export function saveGlobals(origin, gasprice, block) {
  return {
    type: SAVE_GLOBALS,
    origin,
    gasprice,
    block
  };
}

export const CALL = "CALL";
export function call(address, data, storageAddress, sender, value) {
  return {
    type: CALL,
    address,
    data,
    storageAddress,
    sender,
    value
  };
}

export const CREATE = "CREATE";
export function create(binary, storageAddress, sender, value) {
  return {
    type: CREATE,
    binary,
    storageAddress,
    sender,
    value
  };
}

export const RETURN = "RETURN";
export function returnCall() {
  return {
    type: RETURN
  };
}

export const FAIL = "FAIL";
export function fail() {
  return {
    type: FAIL
  };
}

export const STORE = "STORE";
export function store(address, slot, value) {
  return {
    type: STORE,
    address,
    slot,
    value
  };
}

export const LOAD = "LOAD";
export function load(address, slot, value) {
  return {
    type: LOAD,
    address,
    slot,
    value
  };
}

export const RESET = "EVM_RESET";
export function reset(storageAddress) {
  return {
    type: RESET,
    storageAddress
  };
}
