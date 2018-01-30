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

export const ADD_CONTEXT = "ADD_CONTEXT";
export function addContext(context) {
  return {
    type: ADD_CONTEXT,
    context
  }
}

export const MERGE_CONTEXT = "MERGE_CONTEXT";
export function mergeContext(index, context) {
  return {
    type: MERGE_CONTEXT,
    index,
    context
  }
}
