import { utils } from "truffle-decoder";

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
  return utils.EVM.toHexString(utils.EVM.keccak256(...args));
}
