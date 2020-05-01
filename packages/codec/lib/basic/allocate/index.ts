import debugModule from "debug";
const debug = debugModule("codec:basic:allocate");

import * as Common from "@truffle/codec/common";
import * as Evm from "@truffle/codec/evm";
import * as Format from "@truffle/codec/format";

//only for direct types!
export function byteLength(
  dataType: Format.Types.Type,
  userDefinedTypes?: Format.Types.TypesById
): number {
  switch (dataType.typeClass) {
    case "bool":
      return 1;
    case "address":
    case "contract":
      return Evm.Utils.ADDRESS_SIZE;
    case "int":
    case "uint":
    case "fixed":
    case "ufixed":
      return dataType.bits / 8;
    case "function":
      switch (dataType.visibility) {
        case "internal":
          return Evm.Utils.PC_SIZE * 2;
        case "external":
          return Evm.Utils.ADDRESS_SIZE + Evm.Utils.SELECTOR_SIZE;
      }
    case "bytes": //we assume we're in the static case
      return (<Format.Types.BytesTypeStatic>dataType).length;
    case "enum": //the only complex case!
      const storedType = <Format.Types.EnumType>userDefinedTypes[dataType.id];
      if (!storedType.options) {
        throw new Common.UnknownUserDefinedTypeError(
          dataType.id,
          Format.Types.typeString(dataType)
        );
      }
      const numValues = storedType.options.length;
      return Math.ceil(Math.log2(numValues) / 8);
  }
}
