import BN from "bn.js";

import * as DecodeUtils from "truffle-decode-utils";

/**
 * read word from memory
 *
 * requires `byte` to be a multiple of WORD_SIZE (32)
 *
 * @param memory - Uint8Array
 * @param offset - number
 * @return {BN}
 */
export function read(memory: Uint8Array, offset: number) {
  return readBytes(memory, offset, DecodeUtils.EVM.WORD_SIZE);
}

/**
 * read <length> amount of bytes from memory, starting at <offset>
 *
 * @param memory - Uint8Array
 * @param offset - number
 * @param length - number
 */
export function readBytes(memory: Uint8Array, offset: number, length: number) {

  // grab `length` bytes no matter what, here fill this array
  var bytes = new Uint8Array(length);
  bytes.fill(0); //fill it wil zeroes to start

  //if the start is beyond the end of memory, just return those 0s
  if (offset >= memory.length) {
    return bytes;
  }

  // if we're reading past the end of memory, truncate the length to read
  let excess = offset + length - memory.length;
  let readLength;
  if (excess > 0) {
    readLength = memory.length - offset;
  }
  else {
    readLength = length;
  }

  //get the (truncated) memory
  let existing = new Uint8Array(memory.buffer, offset, readLength);

  //copy it into our buffer
  bytes.set(existing);

  return bytes;
}
