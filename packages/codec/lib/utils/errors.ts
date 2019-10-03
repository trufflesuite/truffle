import debugModule from "debug";
const debug = debugModule("codec:utils:errors");

import { Values, Errors } from "@truffle/codec/format";
import { TypeUtils } from "./datatype";
import { Definition as DefinitionUtils } from "./definition";
import { Slot } from "@truffle/codec/types/storage";

//this function gives an error message
//for those errors that are meant to possibly
//be wrapped in a DecodingError and thrown
export function message(error: Errors.ErrorForThrowing) {
  switch(error.kind) {
    case "UserDefinedTypeNotFoundError":
      let typeName = TypeUtils.isContractDefinedType(error.type)
        ? error.type.definingContractName + "." + error.type.typeName
        : error.type.typeName;
      return `Unknown ${error.type.typeClass} type ${typeName} of id ${error.type.id}`;
    case "UnsupportedConstantError":
      return `Unsupported constant type ${DefinitionUtils.typeClass(error.definition)}`;
    case "ReadErrorStack":
      return `Can't read stack from position ${error.from} to ${error.to}`;
    case "ReadErrorBytes":
      return `Can't read ${error.length} bytes from input starting at ${error.start}`;
    case "ReadErrorStorage":
      if(error.range.length) {
        return `Can't read ${error.range.length} bytes from storage starting at index ${error.range.from.index} in ${slotAddressPrintout(error.range.from.slot)}`;
      }
      else {
        return `Can't read storage from index ${error.range.from.index} in ${slotAddressPrintout(error.range.from.slot)} to index ${error.range.to.index} in ${slotAddressPrintout(error.range.to.slot)}`;
      }
  }
}

export function slotAddressPrintout(slot: Slot): string {
  if (slot.key !== undefined && slot.path !== undefined) {
    // mapping reference
    let {type: keyEncoding, value: keyValue} = keyInfoForPrinting(slot.key);
    return "keccak(" + keyValue + " as " + keyEncoding + ", " + slotAddressPrintout(slot.path) + ") + " + slot.offset.toString();
  }
  else if (slot.path !== undefined) {
    const pathAddressPrintout = slotAddressPrintout(slot.path);
    return slot.hashPath
      ? "keccak(" + pathAddressPrintout + ")" + slot.offset.toString()
      : pathAddressPrintout + slot.offset.toString();
  }
  else {
    return slot.offset.toString();
  }
}

//this is like the old toSoliditySha3Input, but for debugging purposes ONLY
//it will NOT produce correct input to soliditySha3
//please use mappingKeyAsHex instead if you wish to encode a mapping key.
export function keyInfoForPrinting(input: Values.ElementaryValue): {type: string, value: string} {
  switch(input.type.typeClass) {
    case "uint":
      return {
        type: "uint",
        value: (<Values.UintValue>input).value.asBN.toString()
      };
    case "int":
      return {
        type: "int",
        value: (<Values.IntValue>input).value.asBN.toString()
      };
    case "fixed":
      return {
        type: `fixed256x${input.type.places}`,
        value: (<Values.FixedValue>input).value.asBig.toString()
      };
    case "ufixed":
      return {
        type: `ufixed256x${input.type.places}`,
        value: (<Values.UfixedValue>input).value.asBig.toString()
      };
    case "bool":
      //this is the case that won't work as valid input to soliditySha3 :)
      return {
        type: "uint",
        value: (<Values.BoolValue>input).value.asBoolean.toString()
      };
    case "bytes":
      switch(input.type.kind) {
        case "static":
          return {
            type: "bytes32",
            value: (<Values.BytesValue>input).value.asHex
          };
        case "dynamic":
          return {
            type: "bytes",
            value: (<Values.BytesValue>input).value.asHex
          };
      }
    case "address":
      return {
        type: "address",
        value: (<Values.AddressValue>input).value.asAddress
      };
    case "string":
      let coercedInput: Values.StringValue = <Values.StringValue> input;
      switch(coercedInput.value.kind) {
        case "valid":
          return {
            type: "string",
            value: coercedInput.value.asString
          };
        case "malformed":
          return {
            type: "bytes",
            value: coercedInput.value.asHex
          };
      }
    //fixed and ufixed are skipped for now
  }
}
