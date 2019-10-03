import { Ast, Common, Contexts, Storage } from "@truffle/codec/types";
import * as Allocation from "@truffle/codec/allocate/types";
import { Types } from "@truffle/codec/format";

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
  mappingKeys?: Storage.Slot[];
  userDefinedTypes?: Types.TypesById;
  allocations: AllocationInfo;
  contexts?: Contexts.DecoderContexts;
  currentContext?: Contexts.DecoderContext;
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
  node?: Ast.AstNode;
  name?: string;
  id?: number;
  mutability?: Common.Mutability;
  contractPointer?: string;
  contractNode?: Ast.AstNode;
  contractName?: string;
  contractId?: number;
  contractKind?: Common.ContractKind;
  contractPayable?: boolean;
  isDesignatedInvalid: boolean;
}
