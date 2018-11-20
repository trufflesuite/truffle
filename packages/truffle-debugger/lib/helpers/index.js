import { keccak256 as _keccak256, toHexString } from "lib/data/decode/utils";

const stringify = require("json-stable-stringify");

export function prefixName(prefix, fn) {
  Object.defineProperty(fn, "name", {
    value: `${prefix}.${fn.name}`,
    configurable: true
  });

  return fn;
}

/**
 * @return 0x-prefix string of keccak256 hash
 */
export function keccak256(...args) {
  return toHexString(_keccak256(...args));
}

/**
 * Given an object, return a stable hash by first running it through a stable
 * stringify operation before hashing
 */
export function stableKeccak256(obj) {
  return keccak256(stringify(obj));
}
