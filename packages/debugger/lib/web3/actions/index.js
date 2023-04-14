export const INIT_WEB3 = "INIT_WEB3";
export function init(provider, ensOptions) {
  return {
    type: INIT_WEB3,
    provider,
    ensOptions
  };
}

export const WEB3_READY = "WEB3_READY";
export function web3Ready() {
  return {
    type: WEB3_READY
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

export const FETCH_STORAGE = "FETCH_STORAGE";
export function fetchStorage(address, slot, blockHash, txIndex) {
  return {
    type: FETCH_STORAGE,
    address,
    slot,
    blockHash,
    txIndex
  };
}

export const REVERSE_ENS_RESOLVE = "REVERSE_ENS_RESOLVE";
export function reverseEnsResolve(address) {
  return {
    type: REVERSE_ENS_RESOLVE,
    address
  };
}

export const ENS_RESOLVE = "ENS_RESOLVE";
export function ensResolve(name) {
  return {
    type: ENS_RESOLVE,
    name
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

export const RECEIVE_STORAGE = "RECEIVE_STORAGE";
export function receiveStorage(address, slot, word) {
  return {
    type: RECEIVE_STORAGE,
    address,
    slot,
    word
  };
}

export const RECEIVE_STORAGE_FAIL = "RECEIVE_STORAGE_FAIL";
export function receiveStorageFail(error) {
  return {
    type: RECEIVE_STORAGE_FAIL,
    error
  };
}

export const RECEIVE_ENS_NAME = "RECEIVE_ENS_NAME";
export function receiveEnsName(address, name) {
  return {
    type: RECEIVE_ENS_NAME,
    address,
    name
  };
}

export const RECEIVE_ENS_ADDRESS = "RECEIVE_ENS_ADDRESS";
export function receiveEnsAddress(name, address) {
  return {
    type: RECEIVE_ENS_ADDRESS,
    address,
    name
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
  block,
  blockHash,
  txIndex
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
    block,
    blockHash,
    txIndex
  };
}

export const ERROR_WEB3 = "ERROR_WEB3";
export function error(error) {
  return {
    type: ERROR_WEB3,
    error
  };
}
