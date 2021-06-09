//import directly from Elementary to avoid circularity!
import { Range, StoragePosition, Slot } from "@truffle/codec/format/storage";
//yes, these should probably be *here*, but format needs it, so... :-/
export { Range, StoragePosition, Slot };

export type StorageLength = { bytes: number } | { words: number };
