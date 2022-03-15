import debugModule from "debug";
const debug = debugModule("codec:abify");

import * as Format from "@truffle/codec/format";
import * as Common from "@truffle/codec/common";
import type {
  CalldataDecoding,
  LogDecoding,
  ReturndataDecoding
} from "@truffle/codec/types";
import * as Conversion from "@truffle/codec/conversion";

/** @category ABIfication */
export function abifyType(
  dataType: Format.Types.Type,
  userDefinedTypes?: Format.Types.TypesById
): Format.Types.AbiType | undefined {
  switch (dataType.typeClass) {
    //we only need to specially handle types that don't go in
    //the ABI, or that have some information loss when going
    //in the ABI
    //note that we do need to handle arrays, due to recursion!
    //First: types that do not go in the ABI
    case "mapping":
    case "magic":
    case "type":
    case "options":
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
      if (!fullType.memberTypes) {
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
      if (!fullType.options) {
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
    case "userDefinedValueType": {
      const fullType = <Format.Types.UserDefinedValueTypeType>(
        Format.Types.fullType(dataType, userDefinedTypes)
      );
      if (!fullType.underlyingType) {
        let typeToDisplay = Format.Types.typeString(dataType);
        throw new Common.UnknownUserDefinedTypeError(
          dataType.id,
          typeToDisplay
        );
      }
      const abifiedUnderlying = abifyType(
        fullType.underlyingType,
        userDefinedTypes
      );
      return {
        ...abifiedUnderlying,
        typeHint: Format.Types.typeStringWithoutLocation(dataType)
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
): Format.Values.AbiResult | undefined {
  switch (result.type.typeClass) {
    case "mapping": //doesn't go in ABI
    case "magic": //doesn't go in ABI
    case "type": //doesn't go in ABI
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
                  paddingType: coercedResult.error.paddingType,
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
            type: <Format.Types.TupleType>(
              abifyType(result.type, userDefinedTypes)
            ), //note: may throw exception
            value: abifiedMembers
          };
        case "error":
          return {
            ...coercedResult,
            type: <Format.Types.TupleType>(
              abifyType(result.type, userDefinedTypes)
            ) //note: may throw exception
          };
      }
    }
    case "userDefinedValueType": {
      const coercedResult = <Format.Values.UserDefinedValueTypeResult>result;
      switch (coercedResult.kind) {
        case "value":
          return abifyResult(coercedResult.value, userDefinedTypes);
        case "error":
          return <Format.Errors.BuiltInValueErrorResult>{ //I have no idea what TS is thinking here
            ...coercedResult,
            type: abifyType(result.type, userDefinedTypes)
          };
      }
      break; //to satisfy TS :P
    }
    case "enum": {
      //NOTE: this is the one case where errors are converted to non-error values!!
      //(other than recursively, I mean)
      //be aware!
      let coercedResult = <Format.Values.EnumResult>result;
      let uintType = <Format.Types.UintType>(
        abifyType(result.type, userDefinedTypes)
      ); //may throw exception
      switch (coercedResult.kind) {
        case "value":
          return {
            type: uintType,
            kind: "value",
            value: {
              asBN: coercedResult.value.numericAsBN.clone()
            }
          };
        case "error":
          switch (coercedResult.error.kind) {
            case "EnumOutOfRangeError":
              return {
                type: uintType,
                kind: "value",
                value: {
                  asBN: coercedResult.error.rawAsBN.clone()
                }
              };
            case "EnumPaddingError":
              return {
                type: uintType,
                kind: "error",
                error: {
                  kind: "UintPaddingError",
                  paddingType: coercedResult.error.paddingType,
                  raw: coercedResult.error.raw
                }
              };
            case "EnumNotFoundDecodingError":
              let numericValue = coercedResult.error.rawAsBN.clone();
              if (numericValue.bitLength() <= uintType.bits) {
                return {
                  type: uintType,
                  kind: "value",
                  value: {
                    asBN: numericValue
                  }
                };
              } else {
                return {
                  type: uintType,
                  kind: "error",
                  error: {
                    kind: "UintPaddingError",
                    paddingType: "left", //we're dealing with ABI-encoded things so we can assume this
                    raw: Conversion.toHexString(numericValue)
                  }
                };
              }
            default:
              return {
                type: uintType,
                kind: "error",
                error: coercedResult.error
              };
          }
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
      return <Format.Values.AbiResult>result; //just coerce :-/
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
        arguments: decoding.arguments.map(argument => ({
          ...argument,
          value: abifyResult(argument.value, userDefinedTypes)
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
    arguments: decoding.arguments.map(argument => ({
      ...argument,
      value: abifyResult(argument.value, userDefinedTypes)
    }))
  };
}

/** @category ABIfication */
export function abifyReturndataDecoding(
  decoding: ReturndataDecoding,
  userDefinedTypes: Format.Types.TypesById
): ReturndataDecoding {
  if (decoding.decodingMode === "abi") {
    return decoding;
  }
  switch (decoding.kind) {
    case "return":
    case "revert":
      return {
        ...decoding,
        decodingMode: "abi",
        arguments: decoding.arguments.map(argument => ({
          ...argument,
          value: abifyResult(argument.value, userDefinedTypes)
        }))
      };
    case "bytecode":
      return {
        ...decoding,
        decodingMode: "abi",
        immutables: undefined
      };
    default:
      return {
        ...decoding,
        decodingMode: "abi"
      };
  }
}
