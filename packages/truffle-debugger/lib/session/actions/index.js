export const START = "SESSION_START";
export function start(txHash, provider) {
  return {
    type: START,
    txHash, provider
  };
}

export const READY = "SESSION_READY";
export function ready() {
  return {
    type: READY,
  };
}

export const RECORD_CONTRACTS = "RECORD_CONTRACTS";
export function recordContracts(...contracts) {
  return {
    type: RECORD_CONTRACTS,
    contracts
  }
}

export const RECORD_TRACE_CONTEXTS = "RECORD_TRACE_CONTEXTS";
export function recordTraceContexts(...contexts) {
  return {
    type: RECORD_TRACE_CONTEXTS,
    contexts
  }
}
