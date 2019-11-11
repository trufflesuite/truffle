import * as Format from "@truffle/codec/format";
import { Context } from "@truffle/codec/contexts/types";

export function contextToType(context: Context): Format.Types.ContractType {
  if (context.contractId !== undefined) {
    return {
      typeClass: "contract",
      kind: "native",
      id: context.contractId.toString(),
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
