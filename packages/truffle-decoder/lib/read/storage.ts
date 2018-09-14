import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";
import Web3 from "web3";

/**
 * convert a slot to a word corresponding to actual storage address
 *
 * if `slot` is an array, return hash of array values.
 * if `slot` array is nested, recurse on sub-arrays
 *
 * @param slot - number or possibly-nested array of numbers
 */
export function slotAddress(slot: DecodeUtils.Allocation.Slot): BN {
  if (typeof slot.key !== "undefined" && typeof slot.path !== "undefined") {
    // mapping reference
    return DecodeUtils.EVM.keccak256(slot.key, slotAddress(slot.path)).add(slot.offset);
  }
  else if (slot.hashOffset === true) {
    return DecodeUtils.EVM.keccak256(slot.offset);
  }
  else if (typeof slot.path !== "undefined") {
    return slotAddress(slot.path).add(slot.offset);
  }
  else {
    return slot.offset;
  }
}

/**
 * read slot from storage
 *
 * @param slot - big number or array of regular numbers
 * @param offset - for array, offset from the keccak determined location
 */
export async function read(storage: any, slot: DecodeUtils.Allocation.Slot, web3?: Web3, contractAddress?: string): Promise<Uint8Array> {
  const address = slotAddress(slot);

  // debug("reading slot: %o", DecodeUtils.toHexString(address));

  const hexAddress = DecodeUtils.Conversion.toHexString(address, DecodeUtils.EVM.WORD_SIZE);
  let word = storage[hexAddress];

  if (typeof word === "undefined" && web3 && contractAddress) {
    // fallback
    word = DecodeUtils.Conversion.toBytes(await web3.eth.getStorageAt(contractAddress, address), 32);
  }

  // debug("word %o", word);
  return word;
}

/**
 * read all bytes in some range.
 *
 * parameters `from` and `to` are objects with the following properties:
 *
 *   slot - (required) one of the following:
 *     - a literal value referring to a slot (a number, a bytestring, etc.)
 *
 *     - a "path" array of literal values
 *       path array values get converted into keccak256 hash as per solidity
 *       storage allocation method, after recursing.
 *
 *     - an object { path, offset }, where path is one of the above ^
 *       offset values indicate sequential address offset, post-keccak
 *
 *     ref: https://solidity.readthedocs.io/en/v0.4.23/miscellaneous.html#layout-of-state-variables-in-storage
 *     (search "concatenation")
 *
 *  index - (default: 0) byte index in word
 *
 * @param from - location (see ^)
 * @param to - location (see ^). inclusive.
 * @param length - instead of `to`, number of bytes after `from`
 */
export async function readRange(storage: any, range: DecodeUtils.Allocation.Range, web3?: Web3, contractAddress?: string): Promise<Uint8Array> {
  // debug("readRange %o", range);

  let { from, to, length } = range;
  if (typeof length === "undefined" && !to || length && to) {
    throw new Error("must specify exactly one `to`|`length`");
  }

  from = {
    slot: from.slot,
    index: from.index || 0
  };

  if (typeof length !== "undefined") {
    to = {
      slot: {
        path: from.slot.path || undefined,
        offset: from.slot.offset.addn(
          Math.floor((from.index + length - 1) / DecodeUtils.EVM.WORD_SIZE)
        )
      },
      index: (from.index + length - 1) % DecodeUtils.EVM.WORD_SIZE
    };
  } else {
    to = {
      slot: to.slot,
      index: to.index
    }
  }

  // debug("normalized readRange %o", {from,to});

  let totalWords: BN | number = to.slot.offset.sub(from.slot.offset).addn(1);
  if (totalWords.bitLength() > 53) {
    throw new Error("must specify range that is less than 53 bits");
  }
  totalWords = totalWords.toNumber();
  // debug("totalWords %o", totalWords);

  let data = new Uint8Array(totalWords * DecodeUtils.EVM.WORD_SIZE);

  for (let i = 0; i < totalWords; i++) {
    let offset = from.slot.offset.addn(i);
    const word = await read(storage, { ...from.slot, offset }, web3, contractAddress);
    data.set(word, i * DecodeUtils.EVM.WORD_SIZE);
  }
  // debug("words %o", data);

  data = data.slice(from.index, (totalWords - 1) * DecodeUtils.EVM.WORD_SIZE + to.index + 1);

  // debug("data: %o", data);

  return data;
}

