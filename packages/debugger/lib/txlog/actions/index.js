export const INTERNAL_CALL = "TXLOG_INTERNAL_CALL";
export function internalCall(pointer, newPointer, step) {
  return {
    type: INTERNAL_CALL,
    pointer,
    newPointer,
    step
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
export function internalReturn(pointer, newPointer, step, variables) {
  return {
    type: INTERNAL_RETURN,
    pointer,
    newPointer,
    step,
    variables
  };
}

export const EXTERNAL_CALL = "TXLOG_EXTERNAL_CALL";
export function externalCall(
  pointer,
  newPointer,
  step,
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
    step,
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
  step,
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
    step,
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
  step,
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
    step,
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
  step,
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
    step,
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
export function externalReturn(
  pointer,
  newPointer,
  step,
  decodings,
  returnData
) {
  return {
    type: EXTERNAL_RETURN,
    pointer,
    newPointer,
    step,
    decodings,
    returnData
  };
}

export const SELFDESTRUCT = "TXLOG_SELFDESTRUCT";
export function selfdestruct(pointer, newPointer, step, beneficiary) {
  return {
    type: SELFDESTRUCT,
    pointer,
    newPointer,
    step,
    beneficiary
  };
}

export const REVERT = "TXLOG_REVERT";
export function revert(pointer, newPointer, step, error) {
  return {
    type: REVERT,
    pointer,
    newPointer,
    step,
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
export function logEvent(pointer, newPointer, step, decoding, rawEventInfo) {
  return {
    type: LOG_EVENT,
    pointer,
    newPointer, //does not actually affect current pointer!
    step,
    decoding,
    rawEventInfo
  };
}

//this may be replaced once decoding info is added
export const STORE = "TXLOG_STORE";
export function store(pointer, newPointer, step, rawSlot, rawValue) {
  return {
    type: STORE,
    pointer,
    newPointer, //does not actually affect current pointer!
    step,
    rawSlot,
    rawValue
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
