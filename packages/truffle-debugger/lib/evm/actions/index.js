export const ADD_CONTEXT = "EVM_ADD_CONTEXT";
export function addContext({
  contractName,
  binary,
  sourceMap,
  compiler,
  abi,
  contractId,
  contractKind,
  isConstructor
}) {
  return {
    type: ADD_CONTEXT,
    contractName,
    binary,
    sourceMap,
    compiler,
    abi,
    contractId,
    contractKind,
    isConstructor
  };
}

export const NORMALIZE_CONTEXTS = "EVM_NORMALIZE_CONTEXTS";
export function normalizeContexts() {
  return { type: NORMALIZE_CONTEXTS };
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

export const SAVE_STATUS = "SAVE_STATUS";
export function saveStatus(status) {
  return {
    type: SAVE_STATUS,
    status
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

export const RETURN_CALL = "RETURN_CALL";
export function returnCall() {
  return {
    type: RETURN_CALL
  };
}

export const RETURN_CREATE = "RETURN_CREATE";
export function returnCreate(address, code, context) {
  return {
    type: RETURN_CREATE,
    address,
    code,
    context
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

export const UNLOAD_TRANSACTION = "EVM_UNLOAD_TRANSACTION";
export function unloadTransaction() {
  return {
    type: UNLOAD_TRANSACTION
  };
}
