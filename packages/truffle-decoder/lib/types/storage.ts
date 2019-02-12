import debugModule from "debug";
const debug = debugModule("decoder:types:storage");

import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";

export type StorageLength = {bytes: number} | {words: number};

export function isWordsLength(size: StorageLength): size is {words: number} {
  return (<{words: number}>size).words !== undefined;
}

export function storageLengthToBytes(size: StorageLength): number {
  if(isWordsLength(size)) {
    debug("size.words %d", size.words);
    return size.words * DecodeUtils.EVM.WORD_SIZE;
  }
  else {
    return size.bytes;
  }
}

export interface Range {
  from: StoragePosition;
  to?: StoragePosition;
  length?: number;
}

export interface StoragePosition {
  slot: Slot;
  index: number;
};

export interface Slot {
  key?: any; // TODO:
  keyEncoding?: string; //see decode/storage.ts for explanation of this
  path?: Slot;
  hashPath?: boolean;
  offset: BN;
};
