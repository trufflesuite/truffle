import debugModule from "debug";
const debug = debugModule("debugger:data:decode:utils");

import { BigNumber } from "bignumber.js";
import Web3 from "web3";

export const WORD_SIZE = 0x20;
export const MAX_WORD = new BigNumber(2).pow(256).minus(1);

/**
 * recursively converts big numbers into something nicer to look at
 */
export function cleanBigNumbers(value) {
  if (BigNumber.isBigNumber(value)) {
    return value.toNumber();

  } else if (value && value.map != undefined) {
    return value.map( (inner) => cleanBigNumbers(inner) );

  } else if (value && typeof value == "object") {
    return Object.assign(
      {}, ...Object.entries(value)
        .map( ([key, inner]) => ({ [key]: cleanBigNumbers(inner) }) )
    );

  } else {
    return value;
  }
}

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

/**
 * Allocate storage for given variable declarations
 *
 * Postcondition: starts a new slot and occupies whole slots
 */
export function allocateDeclarations(
  declarations,
  refs,
  slot = 0,
  index = WORD_SIZE - 1,
  path = []
) {
  if (index < WORD_SIZE - 1) {  // starts a new slot
    slot++;
    index = WORD_SIZE - 1;
  }

  let parentFrom = { slot, index: 0 };
  var parentTo = { slot, index: WORD_SIZE - 1 };
  let mapping = {};

  for (let declaration of declarations) {
    let { from, to, next, children } =
      allocateDeclaration(declaration, refs, slot, index);

    mapping[declaration.id] = { from, to, name: declaration.name };
    if (children !== undefined) {
      mapping[declaration.id].children = children;
    }

    slot = next.slot;
    index = next.index;

    parentTo = { slot: to.slot, index: WORD_SIZE - 1 };
  }

  if (index < WORD_SIZE - 1) {
    slot++;
    index = WORD_SIZE - 1;
  }

  return {
    from: parentFrom,
    to: parentTo,
    next: { slot, index },
    children: mapping
  };
}

function allocateValue(slot, index, bytes) {
  let from = index - bytes + 1 >= 0 ?
    { slot, index: index - bytes + 1 } :
    { slot: slot + 1, index: WORD_SIZE - bytes };

  let to = { slot: from.slot, index: from.index + bytes - 1 };

  let next = from.index == 0 ?
    { slot: from.slot + 1, index: WORD_SIZE - 1 } :
    { slot: from.slot, index: from.index - 1 };

  return { from, to, next };
}

function allocateDeclaration(declaration, refs, slot, index) {
  let definition = refs[declaration.id].definition;
  var byteSize = storageSize(definition);  // yum

  if (typeClass(definition) != "struct") {
    return allocateValue(slot, index, byteSize);
  }

  let struct = refs[definition.typeName.referencedDeclaration];
  debug("struct: %O", struct);

  let result =  allocateDeclarations(struct.variables || [], refs, slot, index);
  debug("struct result %o", result);
  return result;
}

/**
 * e.g. uint48 -> 6
 * @return size in bytes for explicit type size, or `null` if not stated
 */
export function specifiedSize(definition) {
  let specified = typeIdentifier(definition).match(/t_[a-z]+([0-9]+)/);

  if (!specified) {
    return null;
  }

  let num = specified[1];

  switch (typeClass(definition)) {
    case "int":
    case "uint":
      return num / 8;

    case "bytes":
      return num;

    default:
      debug("Unknown type for size specification: %s", typeIdentifier(definition));
  }
}

export function storageSize(definition) {
  switch (typeClass(definition)) {
    case "bool":
      return 1;

    case "address":
      return 20;

    case "int":
    case "uint":
      // is this a HACK? ("256" / 8)
      return typeIdentifier(definition).match(/t_[a-z]+([0-9]+)/)[1] / 8;

    case "string":
    case "bytes":
    case "array":
      return WORD_SIZE;
  }
}

export function isReference(definition) {
  return typeIdentifier(definition).match(/_(memory|storage)(_ptr)?$/) != null;
}

export function referenceType(definition) {
  return typeIdentifier(definition).match(/_([^_]+)(_ptr)?$/)[1];
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
  } else if (typeof bytes == "number" || BigNumber.isBigNumber(bytes)) {
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

  if (BigNumber.isBigNumber(bytes)) {
    bytes = toBytes(bytes);
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

    bytes.set(prior, length - prior.length);
  }

  debug("bytes: %o", bytes);

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

  let hex = number.toString(16);
  if (hex.length % 2 == 1) {
    hex = `0${hex}`;
  }

  let bytes = new Uint8Array(
    hex.match(/.{2}/g)
      .map( (byte) => parseInt(byte, 16) )
  );

  if (bytes.length < length) {
    let prior = bytes;
    bytes = new Uint8Array(length);
    bytes.set(prior, length - prior.length);
  }

  return bytes;
}

export function keccak256(...args) {
  let web3 = new Web3();

  args = args.map( (arg) => {
    if (typeof arg == "number" || BigNumber.isBigNumber(arg)) {
      return toHexString(toBytes(arg, WORD_SIZE)).slice(2)
    } else if (typeof arg == "string") {
      return web3.toHex(arg).slice(2);
    } else {
      return "";
    }
  });

  let sha = web3.sha3(args.join(''), { encoding: 'hex' });
  debug("sha %o", sha);
  return toBigNumber(sha);
}
