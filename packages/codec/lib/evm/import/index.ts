import type * as Format from "@truffle/codec/format";
import { makeTypeId } from "@truffle/codec/contexts/import";
import type { InternalFunction } from "@truffle/codec/evm/types";

//creates a type object for the contract the function was defined in
export function functionTableEntryToType(
  functionEntry: InternalFunction
): Format.Types.ContractTypeNative {
  if (functionEntry.contractNode === null) {
    //for free functions
    return null;
  }
  return {
    typeClass: "contract" as const,
    kind: "native" as const,
    id: makeTypeId(functionEntry.contractId, functionEntry.compilationId),
    typeName: functionEntry.contractName,
    contractKind: functionEntry.contractKind,
    payable: functionEntry.contractPayable
  };
}

export function makeInternalFunctionId(
  functionEntry: InternalFunction
): string {
  return `${functionEntry.compilationId}:${functionEntry.id}`;
}
