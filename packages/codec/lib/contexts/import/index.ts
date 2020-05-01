import * as Format from "@truffle/codec/format";
import { Context } from "@truffle/codec/contexts/types";

export function contextToType(context: Context): Format.Types.ContractType {
  if (context.contractId !== undefined) {
    return {
      typeClass: "contract",
      kind: "native",
      id: makeTypeId(context.contractId, context.compilationId),
      typeName: context.contractName,
      contractKind: context.contractKind,
      payable: context.payable
    };
  } else {
    return {
      typeClass: "contract",
      kind: "foreign",
      typeName: context.contractName,
      contractKind: context.contractKind,
      payable: context.payable
    };
  }
}

//NOTE: I am exporting this for use in other import functions, but please don't
//use this elsewhere!
//If you have to make a type ID, instead make the type and then
//take its ID.
export function makeTypeId(astId: number, compilationId: string): string {
  return `${compilationId}:${astId}`;
}
