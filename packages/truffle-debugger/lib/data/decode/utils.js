import { BigNumber } from "bignumber.js";

export const WORD_SIZE = 0x20;
export const MAX_WORD = new BigNumber(2).pow(256).minus(1);

export function typeIdentifier(definition) {
  return definition.typeDescriptions.typeIdentifier;
}

/**
 * returns basic type class for a variable definition node
 * e.g.:
 *  `t_uint256` becomes `uint`
 *  `t_struct$_Thing_$20_memory_ptr` becomes `struct`
 */
export function typeClass(definition) {
  return typeIdentifier(definition).match(/t_([^$_0-9]+)/)[1];
}

export function isReference(definition) {
  return typeIdentifier(definition).match(/_ptr$/) != null;
}

export function referenceType(definition) {
  return typeIdentifier(definition).match(/_([^_]+)_ptr$/)[1];
}

export function toBigNumber(bytes) {
  return bytes.reduce(
    (num, byte) => num.times(0x100).plus(byte),
    new BigNumber(0)
  );
}

export function toSignedBigNumber(bytes) {
  if (bytes[0] < 0b10000000) {  // first bit is 0
    return toBigNumber(bytes);
  } else {
    return toBigNumber(bytes.map( (b) => 0xff - b )).plus(1).negated();
  }
}

export function toHexString(bytes, omitZeroes) {
  const pad = (s) => `${"00".slice(0, 2 - s.length)}${s}`

  let string = bytes.reduce(
    (str, byte) => `${str}${pad(byte.toString(16))}`, ""
  );

  if (omitZeroes) {
    string = string.replace(/^(00)+/, "");
  }

  if (string.length == 0) {
    string = "00";
  }

  return `0x${string}`;
}
