import * as Ast from "@truffle/codec/ast";
import * as Pointer from "@truffle/codec/pointer";

//memory works the same as abi except we don't bother keeping track of size
//(it's always 1 word) or dynamicity (meaningless in memory)
//Note: for mappings we use a pointer of length 0

export interface MemoryAllocations {
  [id: number]: MemoryAllocation;
}

export interface MemoryAllocation {
  definition: Ast.AstNode;
  members: MemoryMemberAllocation[];
}

export interface MemoryMemberAllocation {
  definition: Ast.AstNode;
  pointer: Pointer.MemoryPointer;
}
