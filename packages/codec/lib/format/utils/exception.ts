import debugModule from "debug";
const debug = debugModule("codec:format:utils:exception");

import * as Format from "@truffle/codec/format/common";
import * as Ast from "@truffle/codec/ast";
import * as Storage from "@truffle/codec/storage/types";

//this function gives an error message
//for those errors that are meant to possibly
//be wrapped in a DecodingError and thrown
export function message(error: Format.Errors.ErrorForThrowing): string {
  switch (error.kind) {
    case "UserDefinedTypeNotFoundError":
      let typeName = Format.Types.isContractDefinedType(error.type)
        ? error.type.definingContractName + "." + error.type.typeName
        : error.type.typeName;
      return `Unknown ${error.type.typeClass} type ${typeName} of id ${
        error.type.id
      }`;
    case "UnsupportedConstantError":
      return `Unsupported constant type ${Ast.Utils.typeClass(
        error.definition
      )}`;
    case "UnusedImmutableError":
      return "Cannot read unused immutable";
    case "ReadErrorStack":
      return `Can't read stack from position ${error.from} to ${error.to}`;
    case "ReadErrorBytes":
      return `Can't read ${error.length} bytes from ${
        error.location
      } starting at ${error.start}`;
    case "ReadErrorStorage":
      if (error.range.length) {
        return `Can't read ${
          error.range.length
        } bytes from storage starting at index ${
          error.range.from.index
        } in ${slotAddressPrintout(error.range.from.slot)}`;
      } else {
        return `Can't read storage from index ${
          error.range.from.index
        } in ${slotAddressPrintout(error.range.from.slot)} to index ${
          error.range.to.index
        } in ${slotAddressPrintout(error.range.to.slot)}`;
      }
  }
}

function slotAddressPrintout(slot: Storage.Slot): string {
  if (slot.key !== undefined && slot.path !== undefined) {
    // mapping reference
    let { type: keyEncoding, value: keyValue } = keyInfoForPrinting(slot.key);
    return (
      "keccak(" +
      keyValue +
      " as " +
      keyEncoding +
      ", " +
      slotAddressPrintout(slot.path) +
      ") + " +
      slot.offset.toString()
    );
  } else if (slot.path !== undefined) {
    const pathAddressPrintout = slotAddressPrintout(slot.path);
    return slot.hashPath
      ? "keccak(" + pathAddressPrintout + ")" + slot.offset.toString()
      : pathAddressPrintout + slot.offset.toString();
  } else {
    return slot.offset.toString();
  }
}

//this is like the old toSoliditySha3Input, but for debugging purposes ONLY
//it will NOT produce correct input to soliditySha3
//please use mappingKeyAsHex instead if you wish to encode a mapping key.
function keyInfoForPrinting(
  input: Format.Values.ElementaryValue
): { type: string; value: string } {
  switch (input.type.typeClass) {
    case "uint":
      return {
        type: "uint",
        value: (<Format.Values.UintValue>input).value.asBN.toString()
      };
    case "int":
      return {
        type: "int",
        value: (<Format.Values.IntValue>input).value.asBN.toString()
      };
    case "fixed":
      return {
        type: `fixed256x${input.type.places}`,
        value: (<Format.Values.FixedValue>input).value.asBig.toString()
      };
    case "ufixed":
      return {
        type: `ufixed256x${input.type.places}`,
        value: (<Format.Values.UfixedValue>input).value.asBig.toString()
      };
    case "bool":
      //this is the case that won't work as valid input to soliditySha3 :)
      return {
        type: "uint",
        value: (<Format.Values.BoolValue>input).value.asBoolean.toString()
      };
    case "bytes":
      switch (input.type.kind) {
        case "static":
          return {
            type: "bytes32",
            value: (<Format.Values.BytesValue>input).value.asHex
          };
        case "dynamic":
          return {
            type: "bytes",
            value: (<Format.Values.BytesValue>input).value.asHex
          };
      }
    case "address":
      return {
        type: "address",
        value: (<Format.Values.AddressValue>input).value.asAddress
      };
    case "string":
      let coercedInput: Format.Values.StringValue = <Format.Values.StringValue>(
        input
      );
      switch (coercedInput.value.kind) {
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
