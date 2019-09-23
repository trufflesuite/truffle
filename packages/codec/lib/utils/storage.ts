import debugModule from "debug";
const debug = debugModule("codec:utils:storage");

import { Slot, StorageLength } from "../types/storage";
import { EVM as EVMUtils } from "./evm";
import { encodeMappingKey } from "../encode/key";

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
