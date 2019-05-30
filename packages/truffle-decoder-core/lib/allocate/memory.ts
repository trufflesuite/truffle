import debugModule from "debug";
const debug = debugModule("decoder:allocate:memory");

import { MemoryPointer } from "../types/pointer";
import { MemoryAllocations, MemoryAllocation } from "../types/allocation";
import { AstDefinition, AstReferences } from "truffle-decode-utils";
import * as DecodeUtils from "truffle-decode-utils";

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
  let allowedMembers = definition.members.filter( (memberDefinition) =>
    !DecodeUtils.Definition.isMapping(memberDefinition));

  return {
    definition,
    members: Object.assign({}, ...allowedMembers.map( (member: AstDefinition, index: number) =>
      ({[member.id]:
        {
          definition: member,
          pointer: {
            memory: {
              start: index * DecodeUtils.EVM.WORD_SIZE,
              length: DecodeUtils.EVM.WORD_SIZE
            }
          }
        }
      })
    ))
  };
}
