import debugModule from "debug";
const debug = debugModule("debugger:data:decode:storage");

import { WORD_SIZE } from "./utils";
import * as utils from "./utils";


/**
 * read slot from storage
 *
 * @param slot - big number or array of regular numbers
 * @param offset - for array, offset from the keccak determined location
 */
export function read(storage, slot, offset = 0) {
  if (slot instanceof Array) {
    slot = utils.keccak256(...slot.map(utils.toBigNumber));
  }

  slot = utils.toBigNumber(slot).plus(offset);

  debug("reading slot: %o", utils.toHexString(slot));

  return storage[utils.toHexString(slot, WORD_SIZE)] ||
    new Uint8Array(WORD_SIZE);
}

/**
 * read <bytes> amount of bytes from storage, starting at some slot
 */
export function readBytes(storage, slot, length, offset = 0) {
  let data = new Uint8Array(length);

  let bytesLeft = length;
  var buffer;
  for (let i = 0; i < length / WORD_SIZE; i++) {
    buffer = read(storage, slot, i + offset);
    if (bytesLeft < WORD_SIZE) {
      buffer = buffer.slice(0, bytesLeft);
    }
    data.set(buffer, i * WORD_SIZE);
    bytesLeft -= buffer.length;
  }

  return data;
}

export function readRange(storage, {from, to, length}) {
  debug("readRange %o", Array.prototype.slice(arguments, [1]));
  if (to != undefined) {
    let trim = to.index - WORD_SIZE + 1;

    return readBytes(
      storage, from.slot, (to.slot - from.slot + 1) * WORD_SIZE  // round up
    ).slice(from.index, trim < 0 ? trim : undefined);

  } else {
    return readBytes(
      storage, from.slot, length, from.offset
    ).slice(from.index);
  }
}

