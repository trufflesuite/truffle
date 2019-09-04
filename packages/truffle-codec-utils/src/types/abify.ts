import debugModule from "debug";
const debug = debugModule("codec-utils:types:abify");

import { Types } from "./types";
import { Values } from "./values";
import { UnknownUserDefinedTypeError } from "../errors";
import BN from "bn.js";

export function abifyType(dataType: Types.Type, userDefinedTypes: Types.TypesById): Types.Type | undefined {
  switch(dataType.typeClass) {
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
        payable: false,
        typeHint: Types.typeString(dataType)
      };
    case "function":
      switch(dataType.visibility) {
        case "external":
          return {
            typeClass: "function",
            visibility: "external",
            kind: "general",
            typeHint: Types.typeString(dataType)
          };
        case "internal": //these don't go in the ABI
          return undefined;
      }
      break; //to satisfy TypeScript
    //the complex cases: struct & enum
    case "struct": {
      const fullType = <Types.StructType> Types.fullType(dataType, userDefinedTypes);
      if(!fullType) {
        let typeToDisplay = Types.typeString(dataType);
        throw new UnknownUserDefinedTypeError(dataType.id, typeToDisplay);
      }
      const memberTypes = fullType.memberTypes.map(
        ({name, type: memberType}) => ({
          name,
          type: abifyType(memberType, userDefinedTypes)
        })
      );
      return {
        typeClass: "tuple",
        typeHint: Types.typeString(fullType),
        memberTypes
      };
    }
    case "enum": {
      const fullType = <Types.EnumType> Types.fullType(dataType, userDefinedTypes);
      if(!fullType) {
        let typeToDisplay = Types.typeString(dataType);
        throw new UnknownUserDefinedTypeError(dataType.id, typeToDisplay);
      }
      let numOptions = fullType.options.length;
      let bits = 8 * Math.ceil(Math.log2(numOptions) / 8);
      return {
        typeClass: "uint",
        bits,
        typeHint: Types.typeString(fullType)
      };
    }
    //finally: arrays
    case "array":
      return {
        ...dataType,
        typeHint: Types.typeString(fullType),
        baseType: abifyType(dataType.baseType, userDefinedTypes)
      };
    //default case: just leave as-is
    default:
      return dataType;
  }
}

export function abifyResult(result: Values.Result, userDefinedTypes: Types.TypesById): Values.Result | undefined {
  switch(result.type.typeClass) {
    case "mapping": //doesn't go in ABI
    case "magic": //doesn't go in ABI
      return undefined;
    case "address":
      //abify the type but leave the value alone
      return {
        ...result,
        type: <Types.AddressType> abifyType(result.type)
      };
    case "contract":
      switch(result.kind) {
        case "value":
          return {
            type: <Types.AddressType> abifyType(result.type),
            kind: "value",
            value: {
              asAddress: result.value.address,
              rawAsHex: result.value.rawAddress
            }
          };
        case "error":
          switch(result.error.kind) {
            case "ContractPaddingError":
              return {
                type: <Types.AddressType> abifyType(result.type),
                kind: "error",
                error: {
                  kind: "AddressPaddingError",
                  raw: result.error.raw
                }
              };
            default:
              return {
                ...result,
                type: <Types.AddressType> abifyType(result.type)
              };
          }
      }
    case "function":
      switch(result.type.visibility) {
        case "external":
          switch(result.kind) {
            case "value":
              return {
                kind: "value",
                type: <Types.FunctionExternalType> abifyType(result.type),
                value: {
                  kind: "unknown",
                  selector: result.value.selector,
                  contract: {
                    kind: "unknown",
                    address: result.value.contract.address,
                    rawAddress: result.value.contract.rawAddress
                  }
                }
              };
            case "error":
              return {
                ...result,
                type: <Types.FunctionExternalType> abifyType(result.type)
              };
          }
        case "internal": //these don't go in the ABI
          return undefined;
      }
      break; //to satisfy TypeScript
    case "struct":
      if(result.reference !== undefined) {
        return undefined; //no circular values in the ABI!
      }
      switch(result.kind) {
        case "value":
          let abifiedMembers = result.value.map(
            ({name, member}) => ({
              name,
              value: abifyResult(member, userDefinedTypes)
            })
          );
          return {
            kind: "value",
            type: <Types.StructType> abifyType(result.type), //note: may throw exception
            value: abifiedMembers
          };
        case "error":
          return {
            ...result,
            type: <Types.StructType> abifyType(result.type) //note: may throw exception
          };
      }
    case "enum":
      //NOTE: this is the one case where errors are converted to non-error values!!
      //(other than recursively, I mean)
      //be aware!
      let uintType = <Types.UintType> abifyType(result.type); //may throw exception
      let numericValue: BN;
      switch(result.kind) {
        case "value":
          numericValue = result.value.numericAsBN.clone();
          break;
        case "error":
          switch(result.error.kind) {
            case "EnumOutOfRangeError":
            case "EnumNotFoundDecodingError":
              //group these together
              numericValue = result.error.raw.clone();
              break;
            default:
              let typeToDisplay = Types.typeString(result.type);
              throw new UnknownUserDefinedTypeError(result.type.id, typeToDisplay);
          }
          break;
      }
      //now: is it within range or not?
      if(numericValue.bitLength() <= uintType.bits) {
        return {
          type: uintType,
          kind: "value",
          value: {
            asBN: numericValue
          }
        };
      }
      else {
        //note: if we started with a value we had better not end up with an error :P
        return {
          type: uintType,
          kind: "error",
          error: {
            kind: "UintPaddingError",
            raw: CodecUtils.Conversion.toHexString(numericValue)
          }
        };
      }
    case "array":
      if(result.reference !== undefined) {
        return undefined; //no circular values in the ABI!
      }
      switch(result.kind) {
        case "value":
          let abifiedMembers = result.value.map(
            member => abifyResult(member, userDefinedTypes)
          );
          return {
            kind: "value",
            type: <Types.ArrayType> abifyType(result.type),
            value: abifiedMembers
          };
        case "error":
          return {
            ...result,
            type: <Types.FunctionExternalType> abifyType(result.type)
          };
      }
    default:
      return value;
  }
}
