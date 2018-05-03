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

  let word = storage[utils.toHexString(slot, WORD_SIZE)] ||
    new Uint8Array(WORD_SIZE);

  debug("word %o", word);
  return word
}

/**
 * read all bytes in some range.
 *
 * parameters `from` and `to` are objects with the following properties:
 *
 *   slot - (required) either a bignumber or a "path" array of integer offsets
 *
 *     path array values get converted into keccak256 hash as per solidity
 *     storage allocation method
 *
 *     ref: https://solidity.readthedocs.io/en/v0.4.23/miscellaneous.html#layout-of-state-variables-in-storage
 *     (search "concatenation")
 *
 *  offset - (default: 0) slot offset
 *
 *  index - (default: 0) byte index in word
 *
 * @param from - location (see ^)
 * @param to - location (see ^). inclusive.
 * @param length - instead of `to`, number of bytes after `from`
 */
export function readRange(storage, {from, to, length}) {
  if (!length && !to || length && to) {
    throw new Error("must specify exactly one `to`|`length`");
  }

  from = {
    ...from,
    offset: from.offset || 0
  };

  if (length) {
    to = {
      slot: from.slot,
      offset: from.offset + Math.floor((from.index + length - 1) / WORD_SIZE),
      index: (from.index + length - 1) % WORD_SIZE
    };
  } else {
    to = {
      ...to,
      offset: to.offset || 0
    }
  }

  debug("readRange %o", {from,to});

  const totalWords = to.offset - from.offset + 1;
  debug("totalWords %o", totalWords);

  let data = new Uint8Array(totalWords * WORD_SIZE);

  for (let i = 0; i < totalWords; i++) {
    let offset = i + from.offset;
    data.set(read(storage, from.slot, offset), i * WORD_SIZE);
  }
  debug("words %o", data);

  data = data.slice(from.index, (totalWords - 1) * WORD_SIZE + to.index + 1);

  debug("data: %o", data);

  return data;
}

