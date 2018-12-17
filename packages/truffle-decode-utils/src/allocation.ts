import { EVM as EVMUtils } from "./evm";
import { Definition as DefinitionUtils } from "./definition";
import { Conversion as ConversionUtils }from "./conversion";
import BN from "bn.js";

export namespace Allocation {
  export interface Range {
    from: StorageReference;
    to: StorageReference;
    name?: string;
    next?: StorageReference;
    children?: RangeMapping;
    length?: number;
  }

  export type RangeMapping = {[id: string]: Range};

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

  /**
   * Allocate storage for given variable declarations
   *
   * Postcondition: starts a new slot and occupies whole slots
   */
  export function allocateDeclarations(
    declarations: any[],
    refs: any[],
    allocations: any, //sorry
    slot: Slot = <Slot>{ offset: new BN(0) },
    index: number = EVMUtils.WORD_SIZE - 1
  ): Range {
    if (index < EVMUtils.WORD_SIZE - 1) {  // starts a new slot
      slot = {
        path: slot,
        offset: new BN(1)
      };
      index = EVMUtils.WORD_SIZE - 1;
    }

    let parentFrom: StorageReference = { slot, index: 0 };
    var parentTo: StorageReference = { slot, index: EVMUtils.WORD_SIZE - 1 };
    let mapping: RangeMapping = {};

    for (let declaration of declarations) {
      let { from, to, next, children } =
        allocateDeclaration(declaration, refs, slot, index, allocations);

      mapping[declaration.id] = { from, to, name: declaration.name };
      if (children !== undefined) {
        mapping[declaration.id].children = children;
      }

      slot = next.slot;
      index = next.index;

      parentTo = { slot: to.slot, index: EVMUtils.WORD_SIZE - 1 };
    }

    if (index < EVMUtils.WORD_SIZE - 1) {
      slot = {
        path: slot,
        offset: new BN(1)
      };
      index = EVMUtils.WORD_SIZE - 1;
    }

    return {
      from: parentFrom,
      to: parentTo,
      next: { slot, index },
      children: mapping
    };
  }

  export function allocateValue(slot: Slot, index: number, bytes: number): Range {
    let from: StorageReference = (index - bytes + 1 >= 0)
      ? { slot, index: index - bytes + 1 }
      : {
          slot: {
            path: slot.path || undefined,
            offset: slot.offset.addn(1)
          },
          index: EVMUtils.WORD_SIZE - bytes
        };

    let to: StorageReference = { slot: from.slot, index: from.index + bytes - 1 };

    let next: StorageReference = (from.index == 0)
      ? {
          slot: {
            path: from.slot.path || undefined,
            offset: from.slot.offset.addn(1)
          },
          index: EVMUtils.WORD_SIZE - 1
        }
      : { slot: from.slot, index: from.index - 1 };

    return { from, to, next, children: {} };
  }

  function allocateDeclaration(declaration: any, refs: any[], slot: Slot, index: number, allocations: any): Range {
    let definition = refs[declaration.id].definition;
    var byteSize = DefinitionUtils.storageSize(definition);  // yum

    if (DefinitionUtils.typeClass(definition) != "struct") {
      return allocateValue(slot, index, byteSize);
    }
    
    if (allocations[declaration.id] !== undefined) {
      return allocations[declaration.id];
    }

    //NOTE: due to the way the allocator is now called, we should never reach
    //this point in the code -- we should *only* be allocating a struct *after*
    //all any structs it refers to have been allocated.  Nonetheless, I'm going
    //to leave this case in for now as something of a failsafe.

    //debug("Warning!  Struct failsafe invoked!")

    let struct = refs[definition.typeName.referencedDeclaration];
    // debug("struct: %O", struct);

    let result = allocateDeclarations(struct.variables || [], refs, allocations, slot, index);
    // debug("struct result %o", result);
    return result;
  }

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
