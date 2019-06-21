import { AstReferences, Contexts, Types } from "truffle-codec-utils";
import * as Allocations from "./allocation";
import { Slot } from "./storage";

export type DecoderMode = "normal" | "permissive" | "strict";
//EXPLANATION OF MODES:
//1. normal mode -- the default
//bad padding causes an error to be returned.
//2. permissive mode -- used for stack decoding
//no error on bad padding for certain types.  other things may still cause errors to be returned.
//3. strict mode -- used for event decoding
//bad padding is an error, yes, but in this mode we don't return errors, we THROW them!
//(except for internal functions; strict mode doesn't affect those)
//(it also doesn't affect indexed reference types)
//also, we throw errors on overlong strings or arrays w/in abi

export interface EvmState {
  storage: WordMapping;
  stack?: Uint8Array[];
  memory?: Uint8Array;
  calldata?: Uint8Array;
  specials?: {
    [builtin: string]: Uint8Array //sorry
  };
  eventdata?: Uint8Array;
  eventtopics?: Uint8Array[];
}

export interface WordMapping {
  [slotAddress: string]: Uint8Array
}

export interface EvmInfo {
  state: EvmState;
  mappingKeys?: Slot[];
  userDefinedTypes?: Types.TypesById;
  allocations: AllocationInfo;
  contexts?: Contexts.DecoderContextsById;
  currentContext?: Contexts.DecoderContext;
  internalFunctionsTable?: InternalFunctions;
}

export interface AllocationInfo {
  storage?: Allocations.StorageAllocations;
  memory?: Allocations.MemoryAllocations;
  abi?: Allocations.AbiAllocations;
  calldata?: Allocations.CalldataAllocations;
  event?: Allocations.EventAllocations;
}

export interface InternalFunctions {
  [pc: number]: InternalFunction
}

export interface InternalFunction {
  source?: number;
  pointer?: string;
  node?: any; //sorry
  name?: string;
  id?: number;
  contractPointer?: string;
  contractNode?: any; //sorry
  contractName?: string;
  contractId?: number;
  contractKind?: string;
  contractPayable?: boolean;
  isDesignatedInvalid: boolean;
}
