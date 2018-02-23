import debugModule from "debug";
const debug = debugModule("debugger:data:decode:utils");

import { BigNumber } from "bignumber.js";
import Web3 from "web3";

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

export function baseDefinition(definition) {
  let baseIdentifier = typeIdentifier(definition)
    // first dollar sign     last dollar sign
    //   `---------.       ,---'
    .match(/^[^$]+\$_(.+)_\$[^$]+$/)[1]
    //              `----' greedy match

  // HACK - internal types for memory or storage also seem to be pointers
  if (baseIdentifier.match(/_(memory|storage)$/) != null) {
    baseIdentifier = `${baseIdentifier}_ptr`;
  }

  // another HACK - we get away with it becausewe're only using that one property
  return {
    typeDescriptions: {
      typeIdentifier: baseIdentifier
    }
  };
}


export function toBigNumber(bytes) {
  if (bytes == undefined) {
    return undefined;
  } else if (typeof bytes == "string") {
    return new BigNumber(bytes, 16);
  } else if (typeof bytes == "number") {
    return new BigNumber(bytes);
  } else if (bytes.reduce) {
    return bytes.reduce(
      (num, byte) => num.times(0x100).plus(byte),
      new BigNumber(0)
    );
  }
}

export function toSignedBigNumber(bytes) {
  if (bytes[0] < 0b10000000) {  // first bit is 0
    return toBigNumber(bytes);
  } else {
    return toBigNumber(bytes.map( (b) => 0xff - b )).plus(1).negated();
  }
}

/**
 * @param bytes - Uint8Array
 * @param length - desired byte length (pad with zeroes)
 * @param trim - omit leading zeroes
 */
export function toHexString(bytes, length = 0, trim = false) {
  if (typeof length == "boolean") {
    trim = length;
    length = 0;
  }

  const pad = (s) => `${"00".slice(0, 2 - s.length)}${s}`

  //                                          0  1  2  3  4
  //                                 0  1  2  3  4  5  6  7
  // bytes.length:        5  -  0x(          e5 c2 aa 09 11 )
  // length (preferred):  8  -  0x( 00 00 00 e5 c2 aa 09 11 )
  //                                `--.---'
  //                                     offset 3
  if (bytes.length < length) {
    let prior = bytes;
    bytes = new Uint8Array(length);

    bytes.set(prior.buffer, length - bytes.length);
  }

  debug("bytes: %o");

  let string = bytes.reduce(
    (str, byte) => `${str}${pad(byte.toString(16))}`, ""
  );

  if (trim) {
    string = string.replace(/^(00)+/, "");
  }

  if (string.length == 0) {
    string = "00";
  }

  return `0x${string}`;
}

export function toBytes(number, length = 0) {
  if (number < 0) {
    return [];
  }

  let bytes = new Uint8Array(
    number.toString(16)
      .match(/.{1,2}/g)
      .map( (byte) => parseInt(byte, 16) )
  );

  if (bytes.length < length) {
    let prior = bytes;
    bytes = new Uint8Array(length);
    bytes.set(prior, length - bytes.length);
  }

  return bytes;
}

export function keccak256(...args) {
  let web3 = new Web3();

  args = args.map( (arg) => {
    if (typeof arg == "number") {
      return toHexString(toBytes(arg, WORD_SIZE)).slice(2)
    } else if (typeof arg == "string") {
      return web3.toHex(arg).slice(2);
    } else {
      return "";
    }
  });

  return web3.sha3(args.join(''), { encoding: 'hex' });
}
