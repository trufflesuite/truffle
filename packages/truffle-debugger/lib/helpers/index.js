import { keccak256 as _keccak256, toHexString } from "lib/data/decode/utils";

export function prefixName(prefix, fn) {
  Object.defineProperty(fn, 'name', {
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
