import debugModule from "debug";
const debug = debugModule("codec:utils:storage");

import BN from "bn.js";
import { Slot, StorageLength } from "../types/storage";
import { EVM as EVMUtils } from "./evm";
import { encodeMappingKey, mappingKeyAsHex } from "../encode/key";

export function isWordsLength(size: StorageLength): size is {words: number} {
  return (<{words: number}>size).words !== undefined;
}

export function storageLengthToBytes(size: StorageLength): number {
  if(isWordsLength(size)) {
    debug("size.words %d", size.words);
    return size.words * EVMUtils.WORD_SIZE;
  }
  else {
    return size.bytes;
  }
}

/**
 * convert a slot to a word corresponding to actual storage address
 *
 * if `slot` is an array, return hash of array values.
 * if `slot` array is nested, recurse on sub-arrays
 *
 * @param slot - number or possibly-nested array of numbers
 */
export function slotAddress(slot: Slot): BN {
  if (slot.key !== undefined && slot.path !== undefined) {
    // mapping reference
    return EVMUtils.keccak256(mappingKeyAsHex(slot.key), slotAddress(slot.path)).add(slot.offset);
  }
  else if (slot.path !== undefined) {
    const pathAddress = slotAddress(slot.path);
    const path: BN = slot.hashPath ? EVMUtils.keccak256(pathAddress) : pathAddress;
    return path.add(slot.offset);
  }
  else {
    return slot.offset;
  }
}

//note: this function compares slots mostly by structure,
//rather than by their numerical value
export function equalSlots(slot1: Slot | undefined, slot2: Slot | undefined): boolean {
  if(!slot1 || !slot2) {
    return !slot1 && !slot2; //if either is undefined, it's true only if both are
  }
  if(!slot1.offset.eq(slot2.offset)) {
    return false;
  }
  if(slot1.hashPath !== slot2.hashPath) {
    return false;
  }
  if(!equalSlots(slot1.path, slot2.path)) {
    return false;
  }
  //to compare keys, we'll just compare their hex encodings
  //(yes, that leaves some wiggle room, as it could consider different
  //*types* of keys to be equal, but if keys are the only difference then
  //that should determine those types, so it shouldn't be a problem)
  if(!slot1.key || !slot2.key) {
    //first, though, they likely don't *have* keys
    return !slot1.key && !slot2.key;
  }
  //if they do have keys, though...
  return EVMUtils.equalData(
    encodeMappingKey(slot1.key),
    encodeMappingKey(slot2.key)
  );
}
