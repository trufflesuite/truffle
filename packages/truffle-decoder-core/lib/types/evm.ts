import { AstReferences, Contexts, Types } from "truffle-decode-utils";
import * as Allocations from "./allocation";
import { Slot } from "./storage";

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
  allocations: {
    storage?: Allocations.StorageAllocations;
    memory?: Allocations.MemoryAllocations;
    abi?: Allocations.AbiAllocations;
    calldata?: Allocations.CalldataAllocations;
    event?: Allocations.EventAllocations;
  }
  contexts?: Contexts.DecoderContexts;
  currentContext?: Contexts.DecoderContext;
  internalFunctionsTable?: InternalFunctions;
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
