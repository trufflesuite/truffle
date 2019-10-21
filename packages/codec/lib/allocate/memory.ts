import debugModule from "debug";
const debug = debugModule("codec:allocate:memory");

import * as Ast from "lib/ast/types";
import * as Allocation from "./types";
import * as DefinitionUtils from "lib/utils/definition";
import * as EvmUtils from "lib/utils/evm";

export function getMemoryAllocations(
  referenceDeclarations: Ast.AstNodes
): Allocation.MemoryAllocations {
  let allocations: Allocation.MemoryAllocations = {};
  for (const node of Object.values(referenceDeclarations)) {
    if (node.nodeType === "StructDefinition") {
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
  for (const member of definition.members) {
    const length = DefinitionUtils.isMapping(member) ? 0 : EvmUtils.WORD_SIZE;
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
