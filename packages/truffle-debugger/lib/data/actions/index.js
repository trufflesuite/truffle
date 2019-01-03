export const SCOPE = "SCOPE";
export function scope(id, pointer, parentId, sourceId) {
  return {
    type: SCOPE,
    id,
    pointer,
    parentId,
    sourceId
  };
}

export const DECLARE = "DECLARE_VARIABLE";
export function declare(node) {
  return {
    type: DECLARE,
    node
  };
}

export const ASSIGN = "ASSIGN";
export function assign(context, assignments) {
  return {
    type: ASSIGN,
    context,
    assignments
  };
}

export const MAP_KEY = "MAP_KEY";
export function mapKey(id, key) {
  return {
    type: MAP_KEY,
    id,
    key
  };
}

export const MAP_KEY_DECODING = "MAP_KEY_DECODING";
export function mapKeyDecoding(started) {
  return {
    type: MAP_KEY_DECODING,
    started
  };
}

export const RESET = "DATA_RESET";
export function reset() {
  return { type: RESET };
}

export const LEARN_ADDRESS = "LEARN_ADDRESS";
export function learnAddress(dummyAddress, address) {
  return {
    type: LEARN_ADDRESS,
    dummyAddress,
    address
  };
}

export const DEFINE_TYPE = "DEFINE_TYPE";
export function defineType(node) {
  return {
    type: DEFINE_TYPE,
    node
  };
}
