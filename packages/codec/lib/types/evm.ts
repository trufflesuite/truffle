import { DecoderContext, DecoderContexts } from "./contexts";
import * as Ast from "./ast";
import { ContractKind, Mutability } from "./common";
import { Types } from "@truffle/codec/format";
import * as Allocation from "./allocation";
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
  allocations: AllocationInfo;
  contexts?: DecoderContexts;
  currentContext?: DecoderContext;
  internalFunctionsTable?: InternalFunctions;
}

export interface AllocationInfo {
  storage?: Allocation.StorageAllocations;
  memory?: Allocation.MemoryAllocations;
  abi?: Allocation.AbiAllocations;
  calldata?: Allocation.CalldataAllocations;
  event?: Allocation.EventAllocations;
}

export interface InternalFunctions {
  [pc: number]: InternalFunction
}

export interface InternalFunction {
  source?: number;
  pointer?: string;
  node?: Ast.Definition;
  name?: string;
  id?: number;
  mutability?: Mutability;
  contractPointer?: string;
  contractNode?: Ast.Definition;
  contractName?: string;
  contractId?: number;
  contractKind?: ContractKind;
  contractPayable?: boolean;
  isDesignatedInvalid: boolean;
}
