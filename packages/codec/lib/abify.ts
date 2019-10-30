import debugModule from "debug";
const debug = debugModule("codec:abify");

import * as Format from "@truffle/codec/format";
import * as Common from "@truffle/codec/common";
import { CalldataDecoding, LogDecoding } from "@truffle/codec/types";
import BN from "bn.js";
import * as Conversion from "@truffle/codec/conversion";

/** @category ABIfication */
export function abifyType(
  dataType: Format.Types.Type,
  userDefinedTypes?: Format.Types.TypesById
): Format.Types.Type | undefined {
  switch (dataType.typeClass) {
    //we only need to specially handle types that don't go in
    //the ABI, or that have some information loss when going
    //in the ABI
    //note that we do need to handle arrays, due to recursion!
    //First: types that do not go in the ABI
    case "mapping":
    case "magic":
      return undefined;
    //Next: address & contract, these can get handled together
    case "address":
    case "contract":
      return {
        typeClass: "address",
        kind: "general",
        typeHint: Format.Types.typeString(dataType)
      };
    case "function":
      switch (dataType.visibility) {
        case "external":
          return {
            typeClass: "function",
            visibility: "external",
            kind: "general",
            typeHint: Format.Types.typeString(dataType)
          };
        case "internal": //these don't go in the ABI
          return undefined;
      }
      break; //to satisfy TypeScript
    //the complex cases: struct & enum
    case "struct": {
      const fullType = <Format.Types.StructType>(
        Format.Types.fullType(dataType, userDefinedTypes)
      );
      if (!fullType) {
        let typeToDisplay = Format.Types.typeString(dataType);
        throw new Common.UnknownUserDefinedTypeError(
          dataType.id,
          typeToDisplay
        );
      }
      const memberTypes = fullType.memberTypes.map(
        ({ name, type: memberType }) => ({
          name,
          type: abifyType(memberType, userDefinedTypes)
        })
      );
      return {
        typeClass: "tuple",
        typeHint: Format.Types.typeString(fullType),
        memberTypes
      };
    }
    case "enum": {
      const fullType = <Format.Types.EnumType>(
        Format.Types.fullType(dataType, userDefinedTypes)
      );
      if (!fullType) {
        let typeToDisplay = Format.Types.typeString(dataType);
        throw new Common.UnknownUserDefinedTypeError(
          dataType.id,
          typeToDisplay
        );
      }
      let numOptions = fullType.options.length;
      let bits = 8 * Math.ceil(Math.log2(numOptions) / 8);
      return {
        typeClass: "uint",
        bits,
        typeHint: Format.Types.typeString(fullType)
      };
    }
    //finally: arrays
    case "array":
      return {
        ...dataType,
        typeHint: Format.Types.typeString(dataType),
        baseType: abifyType(dataType.baseType, userDefinedTypes)
      };
    //default case: just leave as-is
    default:
      return dataType;
  }
}

/** @category ABIfication */
export function abifyResult(
  result: Format.Values.Result,
  userDefinedTypes?: Format.Types.TypesById
): Format.Values.Result | undefined {
  switch (result.type.typeClass) {
    case "mapping": //doesn't go in ABI
    case "magic": //doesn't go in ABI
      return undefined;
    case "address":
      //abify the type but leave the value alone
      return {
        ...(<Format.Values.AddressResult>result),
        type: <Format.Types.AddressType>abifyType(result.type, userDefinedTypes)
      };
    case "contract": {
      let coercedResult = <Format.Values.ContractResult>result;
      switch (coercedResult.kind) {
        case "value":
          return {
            type: <Format.Types.AddressType>(
              abifyType(result.type, userDefinedTypes)
            ),
            kind: "value",
            value: {
              asAddress: coercedResult.value.address,
              rawAsHex: coercedResult.value.rawAddress
            }
          };
        case "error":
          switch (coercedResult.error.kind) {
            case "ContractPaddingError":
              return {
                type: <Format.Types.AddressType>(
                  abifyType(result.type, userDefinedTypes)
                ),
                kind: "error",
                error: {
                  kind: "AddressPaddingError",
                  raw: coercedResult.error.raw
                }
              };
            default:
              //other contract errors are generic errors!
              //but TS doesn't know this so we coerce
              return <Format.Errors.AddressErrorResult>{
                ...coercedResult,
                type: <Format.Types.AddressType>(
                  abifyType(result.type, userDefinedTypes)
                )
              };
          }
      }
      break; //to satisfy typescript
    }
    case "function":
      switch (result.type.visibility) {
        case "external": {
          let coercedResult = <Format.Values.FunctionExternalResult>result;
          return {
            ...coercedResult,
            type: <Format.Types.FunctionExternalType>(
              abifyType(result.type, userDefinedTypes)
            )
          };
        }
        case "internal": //these don't go in the ABI
          return undefined;
      }
      break; //to satisfy TypeScript
    case "struct": {
      let coercedResult = <Format.Values.StructResult>result;
      switch (coercedResult.kind) {
        case "value":
          if (coercedResult.reference !== undefined) {
            return undefined; //no circular values in the ABI!
          }
          let abifiedMembers = coercedResult.value.map(
            ({ name, value: member }) => ({
              name,
              value: abifyResult(member, userDefinedTypes)
            })
          );
          return {
            kind: "value",
            type: <Format.Types.StructType>(
              abifyType(result.type, userDefinedTypes)
            ), //note: may throw exception
            value: abifiedMembers
          };
        case "error":
          return {
            ...coercedResult,
            type: <Format.Types.StructType>(
              abifyType(result.type, userDefinedTypes)
            ) //note: may throw exception
          };
      }
    }
    case "enum": {
      //NOTE: this is the one case where errors are converted to non-error values!!
      //(other than recursively, I mean)
      //be aware!
      let coercedResult = <Format.Values.EnumResult>result;
      let uintType = <Format.Types.UintType>(
        abifyType(result.type, userDefinedTypes)
      ); //may throw exception
      let numericValue: BN;
      switch (coercedResult.kind) {
        case "value":
          numericValue = coercedResult.value.numericAsBN.clone();
          break;
        case "error":
          switch (coercedResult.error.kind) {
            case "EnumOutOfRangeError":
            case "EnumNotFoundDecodingError":
              //group these together
              numericValue = coercedResult.error.rawAsBN.clone();
              break;
            default:
              let typeToDisplay = Format.Types.typeString(result.type);
              throw new Common.UnknownUserDefinedTypeError(
                coercedResult.type.id,
                typeToDisplay
              );
          }
          break;
      }
      //now: is it within range or not?
      if (numericValue.bitLength() <= uintType.bits) {
        return {
          type: uintType,
          kind: "value",
          value: {
            asBN: numericValue
          }
        };
      } else {
        //note: if we started with a value we had better not end up with an error :P
        return {
          type: uintType,
          kind: "error",
          error: {
            kind: "UintPaddingError",
            raw: Conversion.toHexString(numericValue)
          }
        };
      }
    }
    case "array": {
      let coercedResult = <Format.Values.ArrayResult>result;
      switch (coercedResult.kind) {
        case "value":
          if (coercedResult.reference !== undefined) {
            return undefined; //no circular values in the ABI!
          }
          let abifiedMembers = coercedResult.value.map(member =>
            abifyResult(member, userDefinedTypes)
          );
          return {
            kind: "value",
            type: <Format.Types.ArrayType>(
              abifyType(result.type, userDefinedTypes)
            ),
            value: abifiedMembers
          };
        case "error":
          return {
            ...coercedResult,
            type: <Format.Types.ArrayType>(
              abifyType(result.type, userDefinedTypes)
            )
          };
      }
    }
    default:
      return result;
  }
}

/** @category ABIfication */
export function abifyCalldataDecoding(
  decoding: CalldataDecoding,
  userDefinedTypes: Format.Types.TypesById
): CalldataDecoding {
  if (decoding.decodingMode === "abi") {
    return decoding;
  }
  switch (decoding.kind) {
    case "function":
    case "constructor":
      return {
        ...decoding,
        decodingMode: "abi",
        arguments: decoding.arguments.map(({ name, value }) => ({
          name,
          value: abifyResult(value, userDefinedTypes)
        }))
      };
    default:
      return {
        ...decoding,
        decodingMode: "abi"
      };
  }
}

/** @category ABIfication */
export function abifyLogDecoding(
  decoding: LogDecoding,
  userDefinedTypes: Format.Types.TypesById
): LogDecoding {
  if (decoding.decodingMode === "abi") {
    return decoding;
  }
  return {
    ...decoding,
    decodingMode: "abi",
    arguments: decoding.arguments.map(({ name, value }) => ({
      name,
      value: abifyResult(value, userDefinedTypes)
    }))
  };
}
