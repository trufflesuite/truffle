import debugModule from "debug";
const debug = debugModule("codec:types:storage");

import * as CodecUtils from "truffle-codec-utils";
import BN from "bn.js";

export type StorageLength = {bytes: number} | {words: number};

export function isWordsLength(size: StorageLength): size is {words: number} {
  return (<{words: number}>size).words !== undefined;
}

export function storageLengthToBytes(size: StorageLength): number {
  if(isWordsLength(size)) {
    debug("size.words %d", size.words);
    return size.words * CodecUtils.EVM.WORD_SIZE;
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
  key?: CodecUtils.Values.ElementaryResult;
  path?: Slot;
  hashPath?: boolean;
  offset: BN;
};
