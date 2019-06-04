import { StorageLength } from "./storage";
import * as Pointer from "./pointer";
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
  pointer: Pointer.StoragePointer | Pointer.ConstantDefinitionPointer;
}

//abi types below work similar to storage types above; note these are only
//used for structs so there's no need to account for contracts or constants
//also, we now also keep track of which structs are dynamic
//also, we allow an abi allocation to be null to indicate a type not allowed
//in the abi

export interface AbiAllocations {
  [id: number]: AbiAllocation | null
}

export interface AbiAllocation {
  definition: AstDefinition;
  length: number; //measured in bytes
  dynamic: boolean;
  members: AbiMemberAllocations;
}

export interface AbiMemberAllocations {
  [id: number]: AbiMemberAllocation
}

export interface AbiMemberAllocation {
  definition: AstDefinition;
  pointer: Pointer.GenericAbiPointer;
}

//memory works the same as abi except we don't bother keeping track of size
//(it's always 1 word) or dynamicity (meaningless in memory)

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
  pointer: Pointer.MemoryPointer;
}

//next we have calldata, used for the input to an external function;
//because this doesn't go inside something else we don't bother keeping
//track of length or dynamicity.  There's also no need for null allocation.
//So basically this works like memory, except that we *do* store an offset
//indicating the overall start position.
//Also, we index by contract ID and then selector rather than by function ID
//(and have a special one for the constructor)

export interface CalldataAllocations {
  [id: number]: CalldataContractAllocation
}

export interface CalldataContractAllocations {
  constructorAllocation: CalldataAllocation,
  [selector: string]: CalldataAllocation
}

export interface CalldataAllocation {
  definition?: AstDefinition; //may be omitted for implciit constructor
  offset: number; //measured in bytes
  arguments: CalldataArgumentAllocations;
}

export interface CalldataArgumentAllocations {
  [contractId: number]: CalldataArgumentAllocation
}

export interface CalldataArgumentAllocation {
  definition: AstDefinition;
  pointer: Pointer.CalldataPointer;
}

//finally we have events.  these work like calldata, except that
//there's no need for an offset, and the ultimate pointer can
//be either an event data pointer or an event topic pointer
//(also, there's no constructor)
//also, we want to know event argument positions, so that's
//included, too

export interface EventAllocations {
  [contractId: number]: EventContractAllocations
}

export interface EventContractAllocations {
  [selector: string]: EventAllocation
}

export interface EventAllocation {
  definition: AstDefinition;
  arguments: EventMemberAllocations;
}

export interface EventArgumentAllocations {
  [id: number]: EventArgumentAllocation
}

export interface EventArgumentAllocation {
  position: number;
  definition: AstDefinition;
  pointer: Pointer.EventDataPointer | Pointer.EventTopicPointer;
}
