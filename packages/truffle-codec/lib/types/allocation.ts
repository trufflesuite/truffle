import { StorageLength } from "./storage";
import * as Pointer from "./pointer";
import { AstDefinition, Contexts } from "truffle-codec-utils";
import { Abi } from "truffle-contract-schema/spec";

//for passing to calldata/event allocation functions
export interface ContractAllocationInfo {
  abi: Abi;
  id: number;
  constructorContext?: Contexts.DecoderContext;
}

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
  members: StorageMemberAllocation[];
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
  members: AbiMemberAllocation[];
}

export interface AbiMemberAllocation {
  definition: AstDefinition;
  pointer: Pointer.GenericAbiPointer;
}

//memory works the same as abi except we don't bother keeping track of size
//(it's always 1 word) or dynamicity (meaningless in memory)
//Also, we allow pointers to be null to indicate that they're omitted

export interface MemoryAllocations {
  [id: number]: MemoryAllocation
}

export interface MemoryAllocation {
  definition: AstDefinition;
  members: MemoryMemberAllocation[];
}

export interface MemoryMemberAllocation {
  definition: AstDefinition;
  pointer: Pointer.MemoryPointer | null;
}

//next we have calldata, used for the input to an external function;
//because this doesn't go inside something else we don't bother keeping
//track of length or dynamicity.  There's also no need for null allocation.
//So basically this works like memory, except that we *do* store an offset
//indicating the overall start position.
//Also, we index by contract ID and then selector rather than by function ID
//(and have a special one for the constructor)
//also, arguments are in an array by position, rather than being given by
//node ID

export interface CalldataAllocations {
  [contractId: number]: CalldataContractAllocation
}

export interface CalldataContractAllocation {
  constructorAllocation: CalldataAllocation;
  functionAllocations: {
    [selector: string]: CalldataAllocation;
  };
}

export interface CalldataAllocation {
  definition?: AstDefinition; //may be omitted for implicit constructor
  offset: number; //measured in bytes
  arguments: CalldataArgumentAllocation[];
}

export interface CalldataArgumentAllocation {
  definition: AstDefinition;
  pointer: Pointer.CalldataPointer;
}

//finally we have events.  these work like calldata, except that there's no
//need for an offset, the ultimate pointer can be either an event data pointer
//or an event topic pointer, and, they're given *only* by selector -- not by
//contract ID!  Instead the contract ID is included in the allocation

export interface EventAllocations {
  [selector: string]: EventAllocation
}

export interface EventAllocation {
  definition: AstDefinition;
  contractId: number;
  arguments: EventArgumentAllocation[];
}

export interface EventArgumentAllocation {
  definition: AstDefinition;
  pointer: Pointer.EventDataPointer | Pointer.EventTopicPointer;
}
