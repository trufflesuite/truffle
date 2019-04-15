import { AstReferences } from "truffle-decode-utils";
import { StorageAllocations, CalldataAllocations, MemoryAllocations, StorageMemberAllocations } from "./allocation";
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
  referenceDeclarations?: AstReferences;
  storageAllocations?: StorageAllocations;
  calldataAllocations?: CalldataAllocations;
  memoryAllocations?: MemoryAllocations;
}
