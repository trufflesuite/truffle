import { StorageLength } from "./storage";
import { StoragePointer, ConstantDefinitionPointer } from "./pointer";
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

//later this file will also contain types for ABI allocations
