import debugModule from "debug";
const debug = debugModule("codec:encode:key");

import * as Format from "@truffle/codec/format";
import * as ConversionUtils from "@truffle/codec/utils/conversion";
import * as Evm from "@truffle/codec/evm";
import { stringToBytes } from "./abi";

//UGH -- it turns out TypeScript can't handle nested tagged unions
//see: https://github.com/microsoft/TypeScript/issues/18758
//so, I'm just going to have to throw in a bunch of type coercions >_>

export function encodeMappingKey(
  input: Format.Values.ElementaryValue
): Uint8Array {
  let bytes: Uint8Array;
  //TypeScript can at least infer in the rest of this that we're looking
  //at a value, not an error!  But that's hardly enough...
  switch (input.type.typeClass) {
    case "uint":
    case "int":
      return ConversionUtils.toBytes(
        (<Format.Values.UintValue | Format.Values.IntValue>input).value.asBN,
        Evm.Utils.WORD_SIZE
      );
    case "bool": {
      bytes = new Uint8Array(Evm.Utils.WORD_SIZE); //is initialized to zeroes
      if ((<Format.Values.BoolValue>input).value.asBoolean) {
        bytes[Evm.Utils.WORD_SIZE - 1] = 1;
      }
      return bytes;
    }
    case "bytes":
      bytes = ConversionUtils.toBytes(
        (<Format.Values.BytesValue>input).value.asHex
      );
      switch (input.type.kind) {
        case "static":
          let padded = new Uint8Array(Evm.Utils.WORD_SIZE); //initialized to zeroes
          padded.set(bytes);
          return padded;
        case "dynamic":
          return bytes; //NO PADDING IS USED
      }
    case "address":
      return ConversionUtils.toBytes(
        (<Format.Values.AddressValue>input).value.asAddress,
        Evm.Utils.WORD_SIZE
      );
    case "string": {
      let coercedInput: Format.Values.StringValue = <Format.Values.StringValue>(
        input
      );
      switch (
        coercedInput.value.kind //NO PADDING IS USED
      ) {
        case "valid":
          return stringToBytes(coercedInput.value.asString);
        case "malformed":
          return ConversionUtils.toBytes(coercedInput.value.asHex);
      }
      break; //to satisfy TypeScript
    }
    case "fixed":
    case "ufixed":
      let bigValue = (<Format.Values.FixedValue | Format.Values.UfixedValue>(
        input
      )).value.asBig;
      let shiftedValue = ConversionUtils.shiftBigUp(
        bigValue,
        input.type.places
      );
      return ConversionUtils.toBytes(shiftedValue, Evm.Utils.WORD_SIZE);
  }
}

export function mappingKeyAsHex(input: Format.Values.ElementaryValue): string {
  return ConversionUtils.toHexString(encodeMappingKey(input));
}
