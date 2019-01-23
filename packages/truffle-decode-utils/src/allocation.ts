import { Conversion as ConversionUtils } from "./conversion";
import BN from "bn.js";

export namespace Allocation {
  export interface Range {
    from: StorageReference;
    to: StorageReference;
    length?: number;
  }

  export interface StorageReference {
    slot: Slot;
    index: number;
  };

  export interface Slot {
    key?: any; // TODO:
    path?: Slot;
    hashPath?: boolean;
    offset: BN;
  };

  export function normalizeSlot(inputSlot: any): Slot {
    if ((typeof inputSlot === "string" && inputSlot.slice(0,2) == "0x") || typeof inputSlot === "number") {
      return <Slot>{
        offset: ConversionUtils.toBN(inputSlot)
      };
    }

    if (inputSlot instanceof Array) {
      //
    }

    if (typeof inputSlot === "object") {
      // blargh
    }

    // not a known format, give the 0 slot
    return <Slot>{
      offset: new BN(0)
    };
  }
}
