import debugModule from "debug";
const debug = debugModule("codec:allocate:memory");

import { MemoryPointer } from "../types/pointer";
import { MemoryAllocations, MemoryAllocation, MemoryMemberAllocation } from "../types/allocation";
import { AstDefinition, AstReferences } from "../types/ast";
import * as CodecUtils from "../utils";

export function getMemoryAllocations(referenceDeclarations: AstReferences): MemoryAllocations {
  let allocations: MemoryAllocations = {};
  for(const node of Object.values(referenceDeclarations)) {
    if(node.nodeType === "StructDefinition") {
      allocations[node.id] = allocateStruct(node);
    }
  }
  return allocations;
}

//unlike in storage and calldata, we'll just return the one allocation, nothing fancy
//that's because allocating one struct can never necessitate allocating another
function allocateStruct(definition: AstDefinition): MemoryAllocation {
  let memberAllocations: MemoryMemberAllocation[] = [];
  let position = 0;
  for(const member of definition.members) {
    const length = CodecUtils.Definition.isMapping(member)
      ? 0
      : CodecUtils.EVM.WORD_SIZE;
    memberAllocations.push({
      definition: member,
      pointer: {
        location: "memory",
        start: position,
        length
      }
    });
    position += length;
  }

  return {
    definition,
    members: memberAllocations
  };
}
