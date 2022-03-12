export const INTERNAL_CALL = "TXLOG_INTERNAL_CALL";
export function internalCall(pointer, newPointer) {
  return {
    type: INTERNAL_CALL,
    pointer,
    newPointer
  };
}

export const ABSORBED_CALL = "TXLOG_ABSORBED_CALL";
export function absorbedCall(pointer) {
  return {
    type: ABSORBED_CALL,
    pointer
  };
}

export const INTERNAL_RETURN = "TXLOG_INTERNAL_RETURN";
export function internalReturn(pointer, newPointer, variables) {
  return {
    type: INTERNAL_RETURN,
    pointer,
    newPointer,
    variables
  };
}

export const EXTERNAL_CALL = "TXLOG_EXTERNAL_CALL";
export function externalCall(
  pointer,
  newPointer,
  address,
  context,
  value,
  isDelegate,
  kind,
  decoding,
  calldata,
  absorbNextInternalCall
) {
  return {
    type: EXTERNAL_CALL,
    pointer,
    newPointer,
    address,
    context,
    value,
    isDelegate,
    kind,
    decoding,
    calldata,
    absorbNextInternalCall
  };
}

export const INSTANT_EXTERNAL_CALL = "TXLOG_INSTANT_EXTERNAL_CALL";
export function instantExternalCall(
  pointer,
  newPointer, //does not actually affect the current pointer!
  address,
  context,
  value,
  isDelegate,
  kind,
  decoding,
  calldata,
  absorbNextInternalCall,
  status
) {
  return {
    type: INSTANT_EXTERNAL_CALL,
    pointer,
    newPointer,
    address,
    context,
    value,
    isDelegate,
    kind,
    decoding,
    calldata,
    absorbNextInternalCall,
    status
  };
}

export const CREATE = "TXLOG_CREATE";
export function create(
  pointer,
  newPointer,
  address,
  context,
  value,
  salt,
  decoding,
  binary
) {
  return {
    type: CREATE,
    pointer,
    newPointer,
    address,
    context,
    value,
    salt,
    decoding,
    binary
  };
}

export const INSTANT_CREATE = "TXLOG_INSTANT_CREATE";
export function instantCreate(
  pointer,
  newPointer, //does not actually affect the current pointer!
  address,
  context,
  value,
  salt,
  decoding,
  binary,
  status
) {
  return {
    type: INSTANT_CREATE,
    pointer,
    newPointer,
    address,
    context,
    value,
    salt,
    decoding,
    binary,
    status
  };
}

export const EXTERNAL_RETURN = "TXLOG_EXTERNAL_RETURN";
export function externalReturn(pointer, newPointer, decodings, returnData) {
  return {
    type: EXTERNAL_RETURN,
    pointer,
    newPointer,
    decodings,
    returnData
  };
}

export const SELFDESTRUCT = "TXLOG_SELFDESTRUCT";
export function selfdestruct(pointer, newPointer, beneficiary) {
  return {
    type: SELFDESTRUCT,
    pointer,
    newPointer,
    beneficiary
  };
}

export const REVERT = "TXLOG_REVERT";
export function revert(pointer, newPointer, error) {
  return {
    type: REVERT,
    pointer,
    newPointer,
    error
  };
}

export const IDENTIFY_FUNCTION_CALL = "TXLOG_IDENTIFY_FUNCTION_CALL";
export function identifyFunctionCall(
  pointer,
  functionNode,
  contractNode,
  variables
) {
  return {
    type: IDENTIFY_FUNCTION_CALL,
    pointer,
    functionNode,
    contractNode,
    variables
  };
}

export const LOG_EVENT = "TXLOG_LOG_EVENT";
export function logEvent(pointer, newPointer, decoding) {
  return {
    type: LOG_EVENT,
    pointer,
    newPointer, //does not actually affect current pointer!
    decoding
  };
}

export const RECORD_ORIGIN = "TXLOG_RECORD_ORIGIN";
export function recordOrigin(pointer, address) {
  return {
    type: RECORD_ORIGIN,
    pointer,
    address
  };
}

export const RESET = "TXLOG_RESET";
export function reset() {
  return {
    type: RESET
  };
}

export const UNLOAD_TRANSACTION = "TXLOG_UNLOAD_TRANSACTION";
export function unloadTransaction() {
  return {
    type: UNLOAD_TRANSACTION
  };
}
