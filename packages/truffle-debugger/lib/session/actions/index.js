export const START = "SESSION_START";
export function start(txHash, provider) {
  return {
    type: START,
    txHash,
provider
  };
}

export const READY = "SESSION_READY";
export function ready() {
  return {
    type: READY,
  };
}

export const ERROR = "SESSION_ERROR";
export function error(error) {
  return {
    type: ERROR,
    error
  };
}

export const RECORD_CONTRACTS = "RECORD_CONTRACTS";
export function recordContracts(contexts, sources) {
  return {
    type: RECORD_CONTRACTS,
    contexts,
sources
  };
}

export const SAVE_TRANSACTION = "SAVE_TRANSACTION";
export function saveTransaction(transaction) {
  return {
    type: SAVE_TRANSACTION,
    transaction
  };
}

export const SAVE_RECEIPT = "SAVE_RECEIPT";
export function saveReceipt(receipt) {
  return {
    type: SAVE_RECEIPT,
    receipt
  };
}
