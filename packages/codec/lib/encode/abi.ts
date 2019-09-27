import debugModule from "debug";
const debug = debugModule("codec:encode:abi");

import { Values } from "../format/values";
import { Conversion as ConversionUtils } from "../utils/conversion";
import { EVM as EVMUtils } from "../utils/evm";
import { AbiAllocations, AbiSizeInfo } from "../types/allocation";
import { abiSizeInfo } from "../allocate/abi";
import sum from "lodash.sum";
import utf8 from "utf8";
import BN from "bn.js";

//UGH -- it turns out TypeScript can't handle nested tagged unions
//see: https://github.com/microsoft/TypeScript/issues/18758
//so, I'm just going to have to throw in a bunch of type coercions >_>

//NOTE: Tuple (as opposed to struct) is not supported yet!
//Coming soon though!
export function encodeAbi(input: Values.Result, allocations?: AbiAllocations): Uint8Array | undefined {
  //errors can't be encoded
  if(input.kind === "error") {
    debug("input: %O", input);
    if(input.error.kind === "IndexedReferenceTypeError") {
      //HACK: errors can't be encoded, *except* for indexed reference parameter errors.
      //really this should go in a different encoding function, not encodeAbi, but I haven't
      //written that function yet.  I'll move this case when I do.
      return ConversionUtils.toBytes(input.error.raw, EVMUtils.WORD_SIZE);
    }
    else {
      return undefined;
    }
  }
  let bytes: Uint8Array;
  //TypeScript can at least infer in the rest of this that we're looking
  //at a value, not an error!  But that's hardly enough...
  switch(input.type.typeClass) {
    case "mapping":
    case "magic":
      //neither of these can go in the ABI
      return undefined;
    case "uint":
    case "int":
      return ConversionUtils.toBytes((<Values.UintValue|Values.IntValue>input).value.asBN, EVMUtils.WORD_SIZE);
    case "enum":
      return ConversionUtils.toBytes((<Values.EnumValue>input).value.numericAsBN, EVMUtils.WORD_SIZE);
    case "bool": {
      bytes = new Uint8Array(EVMUtils.WORD_SIZE); //is initialized to zeroes
      if((<Values.BoolValue>input).value.asBoolean) {
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
          return padAndPrependLength(bytes);
      }
    case "address":
      return ConversionUtils.toBytes((<Values.AddressValue>input).value.asAddress, EVMUtils.WORD_SIZE);
    case "contract":
      return ConversionUtils.toBytes((<Values.ContractValue>input).value.address, EVMUtils.WORD_SIZE);
    case "string": {
      let coercedInput: Values.StringValue = <Values.StringValue> input;
      switch(coercedInput.value.kind) {
        case "valid":
          bytes = stringToBytes(coercedInput.value.asString);
          break;
        case "malformed":
          bytes = ConversionUtils.toBytes(coercedInput.value.asHex);
          break;
      }
      return padAndPrependLength(bytes);
    }
    case "function": {
      switch(input.type.visibility) {
        case "internal":
          return undefined; //internal functions can't go in the ABI!
        case "external":
          let coercedInput: Values.FunctionExternalValue = <Values.FunctionExternalValue> input;
          let encoded = new Uint8Array(EVMUtils.WORD_SIZE); //starts filled w/0s
          let addressBytes = ConversionUtils.toBytes(coercedInput.value.contract.address); //should already be correct length
          let selectorBytes = ConversionUtils.toBytes(coercedInput.value.selector); //should already be correct length
          encoded.set(addressBytes);
          encoded.set(selectorBytes, EVMUtils.ADDRESS_SIZE); //set it after the address
          return encoded;
      }
    }
    case "fixed":
    case "ufixed":
      let bigValue = (<Values.FixedValue|Values.UfixedValue>input).value.asBig;
      let shiftedValue = ConversionUtils.shiftBigUp(bigValue, input.type.places);
      return ConversionUtils.toBytes(shiftedValue, EVMUtils.WORD_SIZE);
    case "array": {
      let coercedInput: Values.ArrayValue = <Values.ArrayValue> input;
      if(coercedInput.reference !== undefined) {
        return undefined; //circular values can't be encoded
      }
      let staticEncoding = encodeTupleAbi(coercedInput.value, allocations);
      switch(input.type.kind) {
        case "static":
          return staticEncoding;
        case "dynamic":
          let encoded = new Uint8Array(EVMUtils.WORD_SIZE + staticEncoding.length); //leave room for length
          encoded.set(staticEncoding, EVMUtils.WORD_SIZE); //again, leave room for length beforehand
          let lengthBytes = ConversionUtils.toBytes(coercedInput.value.length, EVMUtils.WORD_SIZE);
          encoded.set(lengthBytes); //and now we set the length
          return encoded;
      }
    }
    case "struct": {
      let coercedInput: Values.StructValue = <Values.StructValue> input;
      if(coercedInput.reference !== undefined) {
        return undefined; //circular values can't be encoded
      }
      return encodeTupleAbi(coercedInput.value.map(({value}) => value), allocations);
    }
    case "tuple": {
      //WARNING: This case is written in a way that involves a bunch of unnecessary recomputation!
      //(That may not be apparent from this one line, but it's true)
      //I'm writing it this way anyway for simplicity, to avoid rewriting the encoder
      //However it may be worth revisiting this in the future if performance turns out to be a problem
      return encodeTupleAbi((<Values.TupleValue>input).value.map(({value}) => value), allocations);
    }
  }
}

export function stringToBytes(input: string): Uint8Array {
  input = utf8.encode(input);
  let bytes = new Uint8Array(input.length);
  for(let i = 0; i < input.length; i++) {
    bytes[i] = input.charCodeAt(i);
  }
  return bytes;
  //NOTE: this will throw an error if the string contained malformed UTF-16!
  //but, well, it shouldn't contain that...
}

function padAndPrependLength(bytes: Uint8Array): Uint8Array {
  let length = bytes.length;
  let paddedLength = EVMUtils.WORD_SIZE * Math.ceil(length / EVMUtils.WORD_SIZE);
  let encoded = new Uint8Array(EVMUtils.WORD_SIZE + paddedLength);
  encoded.set(bytes, EVMUtils.WORD_SIZE); //start 32 in to leave room for the length beforehand
  let lengthBytes = ConversionUtils.toBytes(length, EVMUtils.WORD_SIZE);
  encoded.set(lengthBytes); //and now we set the length
  return encoded;
}

export function encodeTupleAbi(tuple: Values.Result[], allocations?: AbiAllocations): Uint8Array | undefined {
  let elementEncodings = tuple.map(element => encodeAbi(element, allocations));
  if(elementEncodings.some(element => element === undefined)) {
    return undefined;
  }
  let elementSizeInfo: AbiSizeInfo[] = tuple.map(element => abiSizeInfo(element.type, allocations));
  //heads and tails here are as discussed in the ABI docs;
  //for a static type the head is the encoding and the tail is empty,
  //for a dynamic type the head is the pointer and the tail is the encoding
  let heads: Uint8Array[] = [];
  let tails: Uint8Array[] = [];
  //but first, we need to figure out where the first tail will start,
  //by adding up the sizes of all the heads (we can easily do this in
  //advance via elementSizeInfo, without needing to know the particular
  //values of the heads)
  let startOfNextTail = sum(elementSizeInfo.map(elementInfo => elementInfo.size));
  for(let i = 0; i < tuple.length; i++) {
    let head: Uint8Array;
    let tail: Uint8Array;
    if(!elementSizeInfo[i].dynamic) {
      //static case
      head = elementEncodings[i];
      tail = new Uint8Array(); //empty array
    }
    else {
      //dynamic case
      head = ConversionUtils.toBytes(startOfNextTail, EVMUtils.WORD_SIZE);
      tail = elementEncodings[i];
    }
    heads.push(head);
    tails.push(tail);
    startOfNextTail += tail.length;
  }
  //finally, we need to concatenate everything together!
  //since we're dealing with Uint8Arrays, we have to do this manually
  let totalSize = startOfNextTail;
  let encoded = new Uint8Array(totalSize);
  let position = 0;
  for(let head of heads) {
    encoded.set(head, position);
    position += head.length;
  }
  for(let tail of tails) {
    encoded.set(tail, position);
    position += tail.length;
  }
  return encoded;
}
