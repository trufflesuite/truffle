import { AstReferences, Contexts, Types } from "truffle-decode-utils";
import { StorageAllocations, CalldataAllocations, MemoryAllocations } from "./allocation";
import { Slot } from "./storage";

export interface EvmState {
  stack: Uint8Array[];
  storage: WordMapping;
  memory: Uint8Array;
  calldata?: Uint8Array;
  specials?: {
    [builtin: string]: Uint8Array //sorry
  }
}

export interface WordMapping {
  [slotAddress: string]: Uint8Array
}

export interface EvmInfo {
  state: EvmState;
  mappingKeys?: Slot[];
  userDefinedTypes?: Types.TypesById;
  storageAllocations?: StorageAllocations;
  calldataAllocations?: CalldataAllocations;
  memoryAllocations?: MemoryAllocations;
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
