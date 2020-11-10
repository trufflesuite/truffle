export const INTERNAL_CALL = "TXLOG_INTERNAL_CALL";
export function internalCall() {
  return {
    type: INTERNAL_CALL
  };
}

export const INTERNAL_RETURN = "TXLOG_INTERNAL_RETURN";
export function internalReturn(variables) {
  return {
    type: INTERNAL_RETURN,
    variables
  };
}

export const EXTERNAL_CALL = "TXLOG_EXTERNAL_CALL";
export function externalCall(
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
export function create(address, context, value, salt, decoding, binary) {
  return {
    type: CREATE,
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
export function externalReturn(decodings) {
  return {
    type: EXTERNAL_RETURN,
    decodings
  };
}

export const SELFDESTRUCT = "TXLOG_SELFDESTRUCT";
export function selfdestruct(beneficiary) {
  return {
    type: SELFDESTRUCT,
    beneficiary
  };
}

export const REVERT = "TXLOG_REVERT";
export function revert(message) {
  return {
    type: REVERT,
    message
  };
}

export const IDENTIFY_FUNCTION_CALL = "TXLOG_IDENTIFY_FUNCTION_CALL";
export function identifyFunctionCall(functionNode, contractNode, variables) {
  return {
    type: IDENTIFY_FUNCTION_CALL,
    functionNode,
    contractNode,
    variables
  };
}

export const RECORD_ORIGIN = "TXLOG_RECORD_ORIGIN";
export function recordOrigin(address) {
  return {
    type: RECORD_ORIGIN,
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
