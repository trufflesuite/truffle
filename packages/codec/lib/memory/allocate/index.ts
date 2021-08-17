import debugModule from "debug";
const debug = debugModule("codec:memory:allocate");

import type {
  MemoryAllocations,
  MemoryAllocation,
  MemoryMemberAllocation
} from "./types";
import * as Evm from "@truffle/codec/evm";
import type * as Format from "@truffle/codec/format";

export { MemoryAllocations, MemoryAllocation, MemoryMemberAllocation };

export function getMemoryAllocations(
  userDefinedTypes: Format.Types.TypesById
): MemoryAllocations {
  let allocations: MemoryAllocations = {};
  for (const dataType of Object.values(userDefinedTypes)) {
    if (dataType.typeClass === "struct") {
      allocations[dataType.id] = allocateStruct(dataType);
    }
  }
  return allocations;
}

export function isSkippedInMemoryStructs(dataType: Format.Types.Type): boolean {
  if (dataType.typeClass === "mapping") {
    return true;
  } else if (dataType.typeClass === "array") {
    return isSkippedInMemoryStructs(dataType.baseType);
  } else {
    return false;
  }
}

//unlike in storage and calldata, we'll just return the one allocation, nothing fancy
//that's because allocating one struct can never necessitate allocating another
function allocateStruct(dataType: Format.Types.StructType): MemoryAllocation {
  let memberAllocations: MemoryMemberAllocation[] = [];
  let position = 0;
  for (const { name, type: memberType } of dataType.memberTypes) {
    const length = isSkippedInMemoryStructs(memberType)
      ? 0
      : Evm.Utils.WORD_SIZE;
    memberAllocations.push({
      name,
      type: memberType,
      pointer: {
        location: "memory",
        start: position,
        length
      }
    });
    position += length;
  }

  return {
    members: memberAllocations
  };
}
