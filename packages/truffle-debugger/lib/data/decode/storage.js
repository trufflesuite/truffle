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
  debug("slot %o", slot);
  if (slot instanceof Array) {
    slot = utils.keccak256(...slot.map(utils.toBigNumber));
    debug("adjusted: %o", utils.toHexString(slot));
  }

  slot = utils.toBigNumber(slot).plus(offset);

  return storage[utils.toHexString(slot, WORD_SIZE)] ||
    new Uint8Array(WORD_SIZE);
}

/**
 * read <bytes> amount of bytes from storage, starting at some slot
 */
export function readBytes(storage, slot, length) {
  let data = new Uint8Array(length);

  let bytesLeft = length;
  var buffer;
  for (let i = 0; i < length / WORD_SIZE; i++) {
    buffer = read(storage, slot, i);
    if (bytesLeft < WORD_SIZE) {
      buffer = buffer.slice(0, bytesLeft);
    }
    data.set(buffer, i * WORD_SIZE);
    bytesLeft -= buffer.length;
  }

  return data;
}
