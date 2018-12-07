import { AstReferences, EvmVariableReferenceMapping } from "../interface/contract-decoder";

export interface EvmState {
  stack: Uint8Array[];
  storage: {
    [slotAddress: string]: Uint8Array
  };
  memory: Uint8Array;
}

export interface EvmInfo {
  scopes: any;
  state: EvmState;
  mappingKeys?: any;
  referenceDeclarations?: AstReferences;
  referenceVariables?: EvmVariableReferenceMapping;
  variables?: EvmVariableReferenceMapping
}