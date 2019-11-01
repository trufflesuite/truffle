import * as Storage from "@truffle/codec/storage/types";
import * as Ast from "@truffle/codec/ast";
import * as Pointer from "@truffle/codec/pointer";

//let's start with storage allocations

//holds a collection of storage allocations for structs and contracts, indexed
//by the ID of the struct or contract
export interface StorageAllocations {
  [id: number]: StorageAllocation;
}

//an individual storage allocation for (the members of) a struct or (the state
//variables of) a contract
export interface StorageAllocation {
  definition: Ast.AstNode;
  size?: Storage.StorageLength; //only used for structs
  members: StorageMemberAllocation[];
}

//an individual storage reference for a member of a struct or a state variable
//of a contract
export interface StorageMemberAllocation {
  definition: Ast.AstNode;
  definedIn?: Ast.AstNode; //used only for variables of contracts, not structs
  pointer: Pointer.StoragePointer | Pointer.ConstantDefinitionPointer; //latter case will only happen
  //for variables of contracts, not structs
}

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
