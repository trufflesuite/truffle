import { AstReferences } from "truffle-decode-utils";
import { StorageAllocations, StorageMemberAllocations } from "./allocation";

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
  mappingKeys?: any;
  referenceDeclarations?: AstReferences;
  storageAllocations?: StorageAllocations;
  variables?: StorageMemberAllocations;
}
