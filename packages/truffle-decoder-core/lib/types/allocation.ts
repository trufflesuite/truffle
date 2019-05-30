import { StorageLength } from "./storage";
import { StoragePointer, ConstantDefinitionPointer, CalldataPointer, MemoryPointer } from "./pointer";
import { AstDefinition } from "truffle-decode-utils";

//holds a collection of storage allocations for structs and contracts, indexed
//by the ID of the struct or contract
export interface StorageAllocations {
  [id: number]: StorageAllocation
}

//an individual storage allocation for (the members of) a struct or (the state
//variables of) a contract
export interface StorageAllocation {
  definition: AstDefinition;
  size?: StorageLength; //only used for structs
  members: StorageMemberAllocations;
}

//a collection of the individual storage references for (the members of) a
//struct or (the state variables of) a contract, indexed by the ID of the
//member or state variable
export interface StorageMemberAllocations {
  [id: number]: StorageMemberAllocation
}

//an individual storage reference for a member of a struct or a state variable
//of a contract
export interface StorageMemberAllocation {
  definition: AstDefinition;
  pointer: StoragePointer | ConstantDefinitionPointer;
}

//calldata types below work similar to storage types above; note these are only
//used for structs so there's no need to account for contracts or constants
//also, we now also keep track of which structs are dynamic
//also, we allow a calldata allocation to be null to indicate a type not allowed
//in calldata

export interface CalldataAllocations {
  [id: number]: CalldataAllocation | null
}

export interface CalldataAllocation {
  definition: AstDefinition;
  length: number; //measured in bytes
  dynamic: boolean;
  members: CalldataMemberAllocations;
}

export interface CalldataMemberAllocations {
  [id: number]: CalldataMemberAllocation
}

export interface CalldataMemberAllocation {
  definition: AstDefinition;
  pointer: CalldataPointer;
}

//and finally, memory; works the same as calldata, except we don't bother keeping
//track of size (it's always 1 word) or dynamicity (meaningless in memory)

export interface MemoryAllocations {
  [id: number]: MemoryAllocation
}

export interface MemoryAllocation {
  definition: AstDefinition;
  members: MemoryMemberAllocations;
}

export interface MemoryMemberAllocations {
  [id: number]: MemoryMemberAllocation
}

export interface MemoryMemberAllocation {
  definition: AstDefinition;
  pointer: MemoryPointer;
}
