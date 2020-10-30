export const ADD_CONTEXT = "EVM_ADD_CONTEXT";
export function addContext({
  context,
  contractName,
  binary,
  sourceMap,
  primarySource,
  immutableReferences,
  compiler,
  compilationId,
  abi,
  contractId,
  contractKind,
  isConstructor,
  linearizedBaseContracts
}) {
  return {
    type: ADD_CONTEXT,
    context,
    contractName,
    binary,
    sourceMap,
    primarySource,
    immutableReferences,
    compiler,
    compilationId,
    abi,
    contractId,
    contractKind,
    isConstructor,
    linearizedBaseContracts
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

export const ADD_AFFECTED_INSTANCE = "EVM_ADD_AFFECTED_INSTANCE";
export function addAffectedInstance(
  address,
  context,
  binary,
  creationBinary,
  creationContext
) {
  return {
    type: ADD_AFFECTED_INSTANCE,
    address,
    context,
    binary,
    creationBinary, //may be undefined
    creationContext
  };
}

export const REFRESH_INSTANCE = "EVM_REFRESH_INSTANCE";
export function refreshInstances(address, context) {
  return {
    type: REFRESH_INSTANCE,
    address,
    context
  };
}

export const SAVE_GLOBALS = "EVM_SAVE_GLOBALS";
export function saveGlobals(origin, gasprice, block) {
  return {
    type: SAVE_GLOBALS,
    origin,
    gasprice,
    block
  };
}

export const SAVE_STATUS = "EVM_SAVE_STATUS";
export function saveStatus(status) {
  return {
    type: SAVE_STATUS,
    status
  };
}

export const CALL = "EVM_CALL";
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

export const CREATE = "EVM_CREATE";
export function create(binary, storageAddress, sender, value) {
  return {
    type: CREATE,
    binary,
    storageAddress,
    sender,
    value
  };
}

export const RETURN_CALL = "EVM_RETURN_CALL";
export function returnCall() {
  return {
    type: RETURN_CALL
  };
}

export const RETURN_CREATE = "EVM_RETURN_CREATE";
export function returnCreate(address, code, context) {
  return {
    type: RETURN_CREATE,
    address,
    code,
    context
  };
}

export const FAIL = "EVM_FAIL";
export function fail() {
  return {
    type: FAIL
  };
}

export const STORE = "EVM_STORE";
export function store(address, slot, value) {
  return {
    type: STORE,
    address,
    slot,
    value
  };
}

export const LOAD = "EVM_LOAD";
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
