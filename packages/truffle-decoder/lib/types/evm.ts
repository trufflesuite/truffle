import { AstReferences } from "truffle-decode-utils";
import { StorageAllocations, StorageMemberAllocations } from "./allocation";
import { Slot } from "./storage";

export interface EvmState {
  stack: Uint8Array[];
  storage: WordMapping;
  memory: Uint8Array;
}

export interface WordMapping {
  [slotAddress: string]: Uint8Array
}

export interface EvmInfo {
  state: EvmState;
  mappingKeys?: Slot[];
  referenceDeclarations?: AstReferences;
  storageAllocations?: StorageAllocations;
  variables?: StorageMemberAllocations;
}
