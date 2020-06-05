export const START = "SESSION_START";
export function start(provider, txHash) {
  return {
    type: START,
    provider,
    txHash //OPTIONAL
  };
}

export const LOAD_TRANSACTION = "SESSION_LOAD_TRANSACTION";
export function loadTransaction(txHash) {
  return {
    type: LOAD_TRANSACTION,
    txHash
  };
}

export const INTERRUPT = "SESSION_INTERRUPT";
export function interrupt() {
  return { type: INTERRUPT };
}

export const UNLOAD_TRANSACTION = "SESSION_UNLOAD_TRANSACTION";
export function unloadTransaction() {
  return {
    type: UNLOAD_TRANSACTION
  };
}

export const READY = "SESSION_READY";
export function ready() {
  return {
    type: READY
  };
}

export const WAIT = "SESSION_WAIT";
export function wait() {
  return {
    type: WAIT
  };
}

export const ERROR = "SESSION_ERROR";
export function error(error) {
  return {
    type: ERROR,
    error
  };
}

export const RECORD_CONTRACTS = "SESSION_RECORD_CONTRACTS";
export function recordContracts(contexts, sources) {
  return {
    type: RECORD_CONTRACTS,
    contexts,
    sources
  };
}

export const SAVE_TRANSACTION = "SESSION_SAVE_TRANSACTION";
export function saveTransaction(transaction) {
  return {
    type: SAVE_TRANSACTION,
    transaction
  };
}

export const SAVE_RECEIPT = "SESSION_SAVE_RECEIPT";
export function saveReceipt(receipt) {
  return {
    type: SAVE_RECEIPT,
    receipt
  };
}

export const SAVE_BLOCK = "SESSION_SAVE_BLOCK";
export function saveBlock(block) {
  return {
    type: SAVE_BLOCK,
    block
  };
}

export const SET_LIGHT_MODE = "SESSION_SET_LIGHT_MODE";
export function setLightMode() {
  return { type: SET_LIGHT_MODE };
}

export const SET_FULL_MODE = "SESSION_SET_FULL_MODE";
export function setFullMode() {
  return { type: SET_FULL_MODE };
}

export const START_FULL_MODE = "SESSION_START_FULL_MODE";
export function startFullMode() {
  return { type: START_FULL_MODE };
}

export const ADD_COMPILATIONS = "SESSION_ADD_COMPILATIONS";
export function addCompilations(sources, contexts) {
  return {
    type: ADD_COMPILATIONS,
    sources,
    contexts
  };
}
