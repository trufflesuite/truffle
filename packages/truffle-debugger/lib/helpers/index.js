import * as utils from "truffle-decode-utils";

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
  return utils.Conversion.toHexString(utils.EVM.keccak256(...args));
}
