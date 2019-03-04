import * as utils from "truffle-decode-utils";

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
  return utils.Conversion.toHexString(utils.EVM.keccak256(...args));
}

/**
 * Given an object, return a stable hash by first running it through a stable
 * stringify operation before hashing
 */
export function stableKeccak256(obj) {
  return keccak256({ type: "string", value: stringify(obj) });
}

/*
 * Given a mmemonic, determine whether it's the mnemonic of a calling
 * instruction (does NOT include creation instructions)
 */
export function isCallMnemonic(op) {
  const calls = ["CALL", "DELEGATECALL", "STATICCALL", "CALLCODE"];
  return calls.includes(op);
}

/*
 * returns true for mnemonics for calls that take only 6 args instead of 7
 */
export function isShortCallMnemonic(op) {
  const shortCalls = ["DELEGATECALL", "STATICCALL"];
  return shortCalls.includes(op);
}

/*
 * Given a mmemonic, determine whether it's the mnemonic of a creation
 * instruction
 */
export function isCreateMnemonic(op) {
  const creates = ["CREATE", "CREATE2"];
  return creates.includes(op);
}
