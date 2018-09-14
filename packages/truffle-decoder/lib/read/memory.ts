import BN from "bn.js";

import * as DecodeUtils from "@seesemichaelj/truffle-decode-utils";

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
  const offsetBN = DecodeUtils.Conversion.toBN(offset);
  let lengthBN = DecodeUtils.Conversion.toBN(length);

  if (offsetBN.toNumber() >= memory.length) {
    return new Uint8Array(lengthBN ? lengthBN.toNumber() : 0);
  }

  if (lengthBN == undefined) {
    return new Uint8Array(memory.buffer, offsetBN.toNumber());
  }

  // grab `length` bytes no matter what, here fill this array
  var bytes = new Uint8Array(lengthBN.toNumber());

  // if we're reading past the end of memory, truncate the length to read
  let excess = offsetBN.add(lengthBN).subn(memory.length).toNumber();
  if (excess > 0) {
    lengthBN = new BN(memory.length).sub(offsetBN);
  }

  let existing = new Uint8Array(memory.buffer, offsetBN.toNumber(), lengthBN.toNumber());

  bytes.set(existing);

  return bytes;
}

/**
 * Split memory into chunks
 */
export function chunk(memory: Uint8Array, size = DecodeUtils.EVM.WORD_SIZE): Uint8Array[] {
  let chunks: Uint8Array[] = [];

  for (let i = 0; i < memory.length; i += size) {
    let chunk = readBytes(memory, i, size);
    chunks.push(chunk);
  }

  return chunks;
}
