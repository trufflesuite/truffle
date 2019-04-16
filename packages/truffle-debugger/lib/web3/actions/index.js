export const INIT_WEB3 = "INIT_WEB3";
export function init(provider) {
  return {
    type: INIT_WEB3,
    provider
  };
}

export const INSPECT = "INSPECT_TRANSACTION";
export function inspect(txHash) {
  return {
    type: INSPECT,
    txHash
  };
}

export const FETCH_BINARY = "FETCH_BINARY";
export function fetchBinary(address, block) {
  return {
    type: FETCH_BINARY,
    address,
    block //optional
  };
}

export const RECEIVE_BINARY = "RECEIVE_BINARY";
export function receiveBinary(address, binary) {
  return {
    type: RECEIVE_BINARY,
    address,
    binary
  };
}

export const RECEIVE_TRACE = "RECEIVE_TRACE";
export function receiveTrace(trace) {
  return {
    type: RECEIVE_TRACE,
    trace
  };
}

export const RECEIVE_CALL = "RECEIVE_CALL";
export function receiveCall({
  address,
  binary,
  data,
  storageAddress,
  status,
  sender,
  value,
  gasprice,
  block
}) {
  return {
    type: RECEIVE_CALL,
    address,
    binary,
    data,
    storageAddress,
    status, //only used for creation calls at present!
    sender,
    value,
    gasprice,
    block
  };
}

export const ERROR_WEB3 = "ERROR_WEB3";
export function error(error) {
  return {
    type: ERROR_WEB3,
    error
  };
}
