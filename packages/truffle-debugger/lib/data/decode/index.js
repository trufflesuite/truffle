import debugModule from "debug";
const debug = debugModule("debugger:data:decode");

import {BigNumber} from "bignumber.js";

const WORD_SIZE = 0x20;

/**
 * read word from memory
 *
 * requires `byte` to be a multiple of WORD_SIZE (32)
 *
 * @param memory - Uint8Array
 * @return {BigNumber}
 */
export function read(memory, byte) {
  byte = BigNumber.isBigNumber(byte) ? byte : new BigNumber(byte, 16);

  if (byte.modulo(WORD_SIZE) != 0) {
    return null;
  }

  debug("byte: %o", byte.toNumber());
  let wordBytes = new Uint8Array(memory.buffer, byte.toNumber(), WORD_SIZE);
  debug("wordBytes length: %o", wordBytes.length);
  return wordBytes.reduce(
    (num, byte) => num.times(16).plus(byte), new BigNumber(0)
  );

}

/**
 * read <bytes> amount of bytes from memory, starting at byte <start>
 *
 * @param memory - Uint8Array
 */
export function readBytes(memory, byte, length) {
  byte = BigNumber.isBigNumber(byte) ? byte : new BigNumber(byte, 16);
  length = BigNumber.isBigNumber(length) ? length : new BigNumber(length, 16);

  // grab `length` bytes no matter what, here fill this array
  var bytes = new Uint8Array(length.toNumber());

  // if we're reading past the end of memory, truncate the length to read
  let excess = byte.plus(length).minus(memory.length).toNumber();
  if (excess > 0) {
    length = memory.length - byte.toNumber();
  }

  let existing = new Uint8Array(memory.buffer, byte, length);
  debug("excess: %o", excess);
  debug("bytes %o", bytes.length);
  debug("existing %o", existing.length);

  bytes.set(existing);

  return bytes;
}


export default function decode(definition, stackIndex, {stack, memory, storage}) {
  let rawValue = new BigNumber(stack[stackIndex], 16);

  memory = new Uint8Array(
    memory.join("")
      .match(/.{1,2}/g)
      .map( (byteString) => parseInt(byteString, 16))
  );
  var length;
  var bytes;

  switch (definition.typeDescriptions.typeString) {
    case "string memory":
      debug("rawValue: %o", rawValue.toNumber());

      length = read(memory, rawValue);
      if (length == null) {
        return null;
      }
      debug("length: %o", length);

      bytes = readBytes(memory, rawValue.plus(WORD_SIZE), length);
      debug("bytes: %o", bytes.length);
      return String.fromCharCode.apply(null, bytes);

    default:
      debug("definition: %o", definition.typeDescriptions);
      return rawValue.toNumber();
  }
}
