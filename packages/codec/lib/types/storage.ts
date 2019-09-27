import * as Elementary from "../format/elementary";
//import directly from Elementary to avoid circularity!
import BN from "bn.js";

export type StorageLength = {bytes: number} | {words: number};

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
  key?: Elementary.ElementaryValue;
  path?: Slot;
  hashPath?: boolean;
  offset: BN;
};
