import debugModule from "debug";
const debug = debugModule("codec:encode:key");

import { Values } from "../format";
import { Conversion as ConversionUtils, EVM as EVMUtils } from "../utils";
import { stringToBytes } from "./abi";
import BN from "bn.js";

//UGH -- it turns out TypeScript can't handle nested tagged unions
//see: https://github.com/microsoft/TypeScript/issues/18758
//so, I'm just going to have to throw in a bunch of type coercions >_>

export function encodeMappingKey(input: Values.ElementaryValue): Uint8Array {
  let bytes: Uint8Array;
  //TypeScript can at least infer in the rest of this that we're looking
  //at a value, not an error!  But that's hardly enough...
  switch(input.type.typeClass) {
    case "uint":
    case "int":
      return ConversionUtils.toBytes((<Values.UintValue|Values.IntValue>input).value.asBN, EVMUtils.WORD_SIZE);
    case "bool": {
      bytes = new Uint8Array(EVMUtils.WORD_SIZE); //is initialized to zeroes
      if((<Values.BoolValue>input).value.asBool) {
        bytes[EVMUtils.WORD_SIZE - 1] = 1;
      }
      return bytes;
    }
    case "bytes":
      bytes = ConversionUtils.toBytes((<Values.BytesValue>input).value.asHex);
      switch(input.type.kind) {
        case "static":
          let padded = new Uint8Array(EVMUtils.WORD_SIZE); //initialized to zeroes
          padded.set(bytes);
          return padded;
        case "dynamic":
          return bytes; //NO PADDING IS USED
      }
    case "address":
      return ConversionUtils.toBytes((<Values.AddressValue>input).value.asAddress, EVMUtils.WORD_SIZE);
    case "string": {
      let coercedInput: Values.StringValue = <Values.StringValue> input;
      switch(coercedInput.value.kind) { //NO PADDING IS USED
        case "valid":
          return stringToBytes(coercedInput.value.asString);
        case "malformed":
          return ConversionUtils.toBytes(coercedInput.value.asHex);
      }
      break; //to satisfy TypeScript
    }
    case "fixed":
    case "ufixed":
      let bigValue = (<Values.FixedValue|Values.UfixedValue>input).value.asBig;
      let shiftedValue = ConversionUtils.shiftBigUp(bigValue, input.type.places);
      return ConversionUtils.toBytes(shiftedValue, EVMUtils.WORD_SIZE);
  }
}

export function mappingKeyAsHex(input: Values.ElementaryValue): string {
  return ConversionUtils.toHexString(encodeMappingKey(input));
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
        value: (<Values.BoolValue>input).value.asBool.toString()
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
