import { AstReferences, StorageAllocations, StorageMemberAllocations } from "../interface/contract-decoder";

export interface EvmState {
  stack: Uint8Array[];
  storage: {
    [slotAddress: string]: Uint8Array
  };
  memory: Uint8Array;
}

export interface EvmInfo {
  state: EvmState;
  mappingKeys?: any;
  referenceDeclarations?: AstReferences;
  storageAllocations?: StorageAllocations;
  variables?: StorageMemberAllocations;
}
