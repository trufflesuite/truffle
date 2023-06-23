import type * as Abi from "@truffle/abi-utils";

import type * as Compiler from "@truffle/codec/compiler";
import type * as Compilations from "@truffle/codec/compilations";
import type * as Ast from "@truffle/codec/ast";
import type * as Contexts from "@truffle/codec/contexts/types";
import type * as Pointer from "@truffle/codec/pointer";
import type { DecodingMode } from "@truffle/codec/types";
import type { ImmutableReferences } from "@truffle/contract-schema/spec";
import type * as Format from "@truffle/codec/format";

//for passing to calldata/returndata/event/state allocation functions
export interface ContractAllocationInfo {
  abi?: Abi.Abi; //needed for all but state
  contractNode: Ast.AstNode; //needed for all
  deployedContext?: Contexts.Context; //needed for all
  constructorContext?: Contexts.Context; //needed for calldata & returndata; eventually will be needed for events
  immutableReferences?: ImmutableReferences; //needed for state
  compiler: Compiler.CompilerVersion; //needed for all
  compilationId?: string; //needed for all
}

export interface ContractAndContexts {
  compilationId: string;
  contract: Compilations.Contract;
  node: Ast.AstNode;
  deployedContext?: Contexts.Context;
  constructorContext?: Contexts.Context;
}

export interface AbiSizeInfo {
  size: number;
  dynamic: boolean;
}

//abi types below work similar to allocate/storage types; note these are only
//used for structs so there's no need to account for contracts or constants
//also, we now also keep track of which structs are dynamic
//also, we allow an abi allocation to be null to indicate a type not allowed
//in the abi

export interface AbiAllocations {
  [id: string]: AbiAllocation | null;
}

export interface AbiAllocation {
  length: number; //measured in bytes
  dynamic: boolean;
  members: AbiMemberAllocation[];
}

export interface AbiMemberAllocation {
  name: string;
  type: Format.Types.Type;
  pointer: Pointer.GenericAbiPointer;
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
  [contextHash: string]: ConstructorCalldataAndReturndataAllocation; //note: just constructor ones
}

export interface CalldataFunctionAllocations {
  [contextHash: string]: {
    [selector: string]: FunctionCalldataAndReturndataAllocation; //note: just function ones
  };
}

export interface ConstructorCalldataAndReturndataAllocation {
  input: CalldataAllocation;
  output: ConstructorReturndataAllocation;
}

export interface FunctionCalldataAndReturndataAllocation {
  input: CalldataAllocation;
  output: ReturnValueReturndataAllocation;
}

export type CalldataAndReturndataAllocation =
  | FunctionCalldataAndReturndataAllocation
  | ConstructorCalldataAndReturndataAllocation;

export interface CalldataAllocation {
  abi: Abi.FunctionEntry | Abi.ConstructorEntry;
  offset: number; //measured in bytes
  arguments: CalldataArgumentAllocation[];
  allocationMode: DecodingMode;
}

export interface CalldataArgumentAllocation {
  name: string;
  type: Format.Types.Type;
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

export interface EventAllocations {
  [topics: number]: {
    bySelector: {
      [selector: string]: {
        [contractKind: string]: {
          [contextHash: string]: EventAllocation[];
        };
      };
    };
    anonymous: {
      [contractKind: string]: {
        [contextHash: string]: EventAllocation[];
      };
    };
  };
}

export interface EventAllocation {
  abi: Abi.EventEntry;
  contextHash: string;
  definedIn?: Format.Types.ContractType | null; //is omitted if we don't know
  id?: string; //is omitted if we don't know
  anonymous: boolean;
  arguments: EventArgumentAllocation[];
  allocationMode: DecodingMode;
}

export interface EventArgumentAllocation {
  name: string;
  type: Format.Types.Type;
  pointer: Pointer.EventDataPointer | Pointer.EventTopicPointer;
}

//now let's go back and fill in returndata
export interface ReturndataAllocations {
  [contextHash: string]: {
    //NOTE: contextHash here can also be "" to represent no context
    [selector: string]: RevertReturndataAllocation[];
  };
}

export type ReturndataAllocation =
  | ReturnValueReturndataAllocation
  | RevertReturndataAllocation
  | ConstructorReturndataAllocation
  | MessageReturndataAllocation
  | BlankReturndataAllocation;

export interface ReturnValueReturndataAllocation {
  kind: "return";
  selector: Uint8Array; //must be empty, but requred for type niceness
  arguments: ReturndataArgumentAllocation[];
  allocationMode: DecodingMode;
}

export interface RevertReturndataAllocation {
  kind: "revert";
  selector: Uint8Array;
  abi: Abi.ErrorEntry;
  id?: string; //may be omitted if we don't know
  definedIn?: Format.Types.ContractType | null; //may be omitted if unknown
  //note that null means it's a "free error", while undefined means we don't
  //know
  arguments: ReturndataArgumentAllocation[];
  allocationMode: DecodingMode;
}

export interface ConstructorReturndataAllocation {
  kind: "bytecode";
  selector: Uint8Array; //must be empty, but is required for type niceness
  immutables?: ReturnImmutableAllocation[];
  delegatecallGuard: boolean;
  allocationMode: DecodingMode;
}

export interface BlankReturndataAllocation {
  kind: "failure" | "selfdestruct";
  selector: Uint8Array; //must be empty, but is required for type niceness
  arguments: []; //must be empty, but required for type niceness
  allocationMode: DecodingMode;
}

export interface MessageReturndataAllocation {
  kind: "returnmessage";
  selector: Uint8Array; //must be empty, but is required for type niceness
  allocationMode: DecodingMode;
}

export interface ReturndataArgumentAllocation {
  name: string;
  type: Format.Types.Type;
  pointer: Pointer.ReturndataPointer;
}

export interface ReturnImmutableAllocation {
  name: string;
  type: Format.Types.Type;
  definedIn: Format.Types.ContractType;
  pointer: Pointer.ReturndataPointer;
}

//NOTE: the folowing types are not for outside use!  just produced temporarily by the allocator!
export interface EventAllocationTemporary {
  selector: string; //included even for anonymous!
  anonymous: boolean;
  topics: number;
  allocation: EventAllocation | undefined;
}

export interface CalldataAllocationTemporary {
  constructorAllocation?: ConstructorCalldataAndReturndataAllocation;
  functionAllocations: {
    [selector: string]: FunctionCalldataAndReturndataAllocation;
  };
}
