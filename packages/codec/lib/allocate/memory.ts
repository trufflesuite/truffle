import debugModule from "debug";
const debug = debugModule("codec:allocate:memory");

import { Ast } from "@truffle/codec/types";
import * as Allocation from "./types";
import * as CodecUtils from "@truffle/codec/utils";

export function getMemoryAllocations(referenceDeclarations: Ast.AstNodes): Allocation.MemoryAllocations {
  let allocations: Allocation.MemoryAllocations = {};
  for(const node of Object.values(referenceDeclarations)) {
    if(node.nodeType === "StructDefinition") {
      allocations[node.id] = allocateStruct(node);
    }
  }
  return allocations;
}

//unlike in storage and calldata, we'll just return the one allocation, nothing fancy
//that's because allocating one struct can never necessitate allocating another
function allocateStruct(definition: Ast.AstNode): Allocation.MemoryAllocation {
  let memberAllocations: Allocation.MemoryMemberAllocation[] = [];
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
