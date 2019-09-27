import { StorageLength } from "./storage";
import * as Pointer from "./pointer";
import { DecoderContext } from "./contexts";
import * as AbiTypes from "./abi";
import { CompilerVersion } from "./compiler";
import { AstDefinition } from "./ast";
import { Types } from "../format";
import { DecodingMode } from "./decoding";

//for passing to calldata/event allocation functions
export interface ContractAllocationInfo {
  abi: AbiTypes.Abi;
  contractNode: AstDefinition;
  deployedContext?: DecoderContext;
  constructorContext?: DecoderContext;
  compiler: CompilerVersion;
}

export interface AbiSizeInfo {
  size: number;
  dynamic: boolean;
}

//let's start with storage allocations

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
  definedIn?: AstDefinition; //used only for variables of contracts, not structs
  pointer: Pointer.StoragePointer | Pointer.ConstantDefinitionPointer; //latter case will only happen
  //for variables of contracts, not structs
}

//abi types below work similar to storage types above; note these are only
//used for structs so there's no need to account for contracts or constants
//also, we now also keep track of which structs are dynamic
//also, we allow an abi allocation to be null to indicate a type not allowed
//in the abi

export interface AbiAllocations {
  [id: string]: AbiAllocation | null
}

export interface AbiAllocation {
  length: number; //measured in bytes
  dynamic: boolean;
  members: AbiMemberAllocation[];
}

export interface AbiMemberAllocation {
  name: string;
  type: Types.Type;
  pointer: Pointer.GenericAbiPointer;
}

//memory works the same as abi except we don't bother keeping track of size
//(it's always 1 word) or dynamicity (meaningless in memory)
//Note: for mappings we use a pointer of length 0

export interface MemoryAllocations {
  [id: number]: MemoryAllocation
}

export interface MemoryAllocation {
  definition: AstDefinition;
  members: MemoryMemberAllocation[];
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
//Also, we index by context hash and then selector rather than by function ID
//also, arguments are in an array by position, rather than being given by
//node ID

export interface CalldataAllocations {
  constructorAllocations: CalldataConstructorAllocations;
  functionAllocations: CalldataFunctionAllocations;
}

export interface CalldataConstructorAllocations {
  [contextHash: string]: CalldataAllocation;
}

export interface CalldataFunctionAllocations {
  [contextHash: string]: {
    [selector: string]: CalldataAllocation;
  };
}

export interface CalldataAllocation {
  abi: AbiTypes.FunctionAbiEntry | AbiTypes.ConstructorAbiEntry;
  offset: number; //measured in bytes
  arguments: CalldataArgumentAllocation[];
  allocationMode: DecodingMode;
}

export interface CalldataArgumentAllocation {
  name: string;
  type: Types.Type;
  pointer: Pointer.CalldataPointer;
}

//finally we have events.  these work like calldata, except that there's no
//need for an offset, the ultimate pointer can be either an event data pointer
//or an event topic pointer, and, they're given:
//1. first by # of topics
//2. then by anonymous or not
//3. then by selector (this one is skipped for anonymou)
//4. then by contract kind
//5. then by (deployed) context hash
//(and then the anonymous ones are in an array)

export interface EventAllocations {
  [topics: number]: {
    bySelector: {
      [selector: string]: {
        [contractKind: string]: {
          [contextHash: string]: EventAllocation;
        }
      }
    };
    anonymous: {
      [contractKind: string]: {
        [contextHash: string]: EventAllocation[];
      }
    }
  }
}

export interface EventAllocation {
  abi: AbiTypes.EventAbiEntry;
  contextHash: string;
  anonymous: boolean;
  arguments: EventArgumentAllocation[];
  allocationMode: DecodingMode;
}

export interface EventArgumentAllocation {
  name: string;
  type: Types.Type;
  pointer: Pointer.EventDataPointer | Pointer.EventTopicPointer;
}

//NOTE: the folowing types are not for outside use!  just produced temporarily by the allocator!
export interface EventAllocationTemporary {
  selector?: string; //leave out for anonymous
  topics: number;
  allocation: EventAllocation;
}

export interface CalldataAllocationTemporary {
  constructorAllocation?: CalldataAllocation;
  functionAllocations: {
    [selector: string]: CalldataAllocation;
  }
}
