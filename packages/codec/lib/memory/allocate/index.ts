import debugModule from "debug";
const debug = debugModule("codec:memory:allocate");

import * as Ast from "@truffle/codec/ast";
import {
  MemoryAllocations,
  MemoryAllocation,
  MemoryMemberAllocation
} from "./types";
import * as Evm from "@truffle/codec/evm";

export { MemoryAllocations, MemoryAllocation, MemoryMemberAllocation };

export function getMemoryAllocations(
  referenceDeclarations: Ast.AstNodes
): MemoryAllocations {
  let allocations: MemoryAllocations = {};
  for (const node of Object.values(referenceDeclarations)) {
    if (node.nodeType === "StructDefinition") {
      allocations[node.id] = allocateStruct(node);
    }
  }
  return allocations;
}

//unlike in storage and calldata, we'll just return the one allocation, nothing fancy
//that's because allocating one struct can never necessitate allocating another
function allocateStruct(definition: Ast.AstNode): MemoryAllocation {
  let memberAllocations: MemoryMemberAllocation[] = [];
  let position = 0;
  for (const member of definition.members) {
    const length = Ast.Utils.isMapping(member) ? 0 : Evm.Utils.WORD_SIZE;
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
