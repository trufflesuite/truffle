import { Types, Values, Conversion as ConversionUtils, EVM as EVMUtils } from "truffle-codec-utils";
import { AbiAllocations } from "../types/allocation";
import { isTypeDynamic, abiSizeForType } from "../allocate/abi";
import sum from "lodash.sum";

export function encodeAbi(input: Values.Result, allocations?: AbiAllocations): Uint8Array | undefined {
  if(input instanceof Values.ErrorResult) {
    return undefined;
  }
  //types that can't go in ABI
  if(input instanceof Values.MappingValue) {
    return undefined;
  }
  if(input instanceof Values.FunctionInternalValue) {
    return undefined;
  }
  if(input instanceof Values.MagicValue) {
    return undefined;
  }
  //now, the types that actually work!
  if(input instanceof Values.UintValue) {
    return ConversionUtils.toBytes(input.value, EVMUtils.WORD_SIZE);
  }
  if(input instanceof Values.IntValue) {
    return ConversionUtils.toBytes(input.value, EVMUtils.WORD_SIZE);
  }
  if(input instanceof Values.EnumValue) {
    return ConversionUtils.toBytes(input.value.numeric, EVMUtils.WORD_SIZE);
  }
  if(input instanceof Values.BoolValue) {
    let bytes = new Uint8Array(EVMUtils.WORD_SIZE); //is initialized to zeroes
    if(input.value) {
      bytes[EVMUtils.WORD_SIZE - 1] = 1;
    }
    return bytes;
  }
  if(input instanceof Values.BytesValue) {
    switch(input.type.kind) {
      case "static": {
        let bytes = ConversionUtils.toBytes(input.value);
        return rightPad(bytes, EVMUtils.WORD_SIZE);
      }
      case "dynamic": {
        let bytes = ConversionUtils.toBytes(input.value);
        return padAndPrependLength(bytes);
      }
    }
  }
  if(input instanceof Values.AddressValue) {
    let bytes = ConversionUtils.toBytes(input.value);
    return rightPad(bytes, EVMUtils.WORD_SIZE);
  }
  if(input instanceof Values.ContractValue) {
    let bytes = ConversionUtils.toBytes(input.value.address);
    return rightPad(bytes, EVMUtils.WORD_SIZE);
  }
  if(input instanceof Values.StringValue) {
    let bytes = stringToBytes(input.value);
    return padAndPrependLength(bytes);
  }
  if(input instanceof Values.FunctionExternalValue) {
    let encoded = new Uint8Array(EVMUtils.WORD_SIZE); //starts filled w/0s
    let addressBytes = ConversionUtils.toBytes(input.value.contract.address); //should already be correct length
    let selectorBytes = ConversionUtils.toBytes(input.value.selector); //should already be correct length
    encoded.set(addressBytes);
    encoded.set(selectorBytes, EVMUtils.ADDRESS_SIZE); //set it after the address
    return encoded;
  }
  //skip fixed/ufixed for now
  if(input instanceof Values.ArrayValue) {
    if(input.reference !== undefined) {
      return undefined; //circular values can't be encoded
    }
    let staticEncoding = encodeTupleAbi(input.value, allocations);
    switch(input.type.kind) {
      case "static":
        return staticEncoding;
      case "dynamic":
        let encoded = new Uint8Array(EVMUtils.WORD_SIZE + staticEncoding.length); //leave room for length
        let lengthBytes = ConversionUtils.toBytes(input.value.length, EVMUtils.WORD_SIZE);
        encoded.set(lengthBytes); //and now we set the length
        return encoded;
    }
  }
  if(input instanceof Values.StructValue) {
    if(input.reference !== undefined) {
      return undefined; //circular values can't be encoded
    }
    return encodeTupleAbi(input.value.map(([_, value]) => value), allocations);
  }
}

function stringToBytes(input: string): Uint8Array {
  //HACK WARNING: does not properly handle the UTF-16 to UTF-8 conversion
  //(i.e. we ignore this problem)
  //HOWEVER, since we also ignore this in the decoder, this should work
  //fine for the purposes we're using it for now >_>
  let bytes = new Uint8Array(input.length);
  for(let i = 0; i < input.length; i++) {
    bytes[i] = input.charCodeAt(i);
  }
  return bytes;
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

function rightPad(bytes: Uint8Array, length: number): Uint8Array {
  let padded = new Uint8Array(length);
  padded.set(bytes);
  return padded;
}

export function encodeTupleAbi(tuple: Values.Result[], allocations?: AbiAllocations): Uint8Array | undefined {
  let elementEncodings = tuple.map(element => encodeAbi(element, allocations));
  if(elementEncodings.some(element => element === undefined)) {
    return undefined;
  }
  let isElementDynamic: boolean[] = tuple.map(element => isTypeDynamic(element.type, allocations));
  //heads and tails here are as discussed in the ABI docs;
  //for a static type the head is the encoding and the tail is empty,
  //for a dynamic type the head is the pointer and the tail is the encoding
  let heads: Uint8Array[] = [];
  let tails: Uint8Array[] = [];
  //but first, we need to figure out where the first tail will start,
  //by adding up the sizes of all the heads (we can easily do this in
  //advance via abiSizeForType, without needing to know the particular
  //values of the heads)
  let startOfNextTail = sum(tuple.map(element => abiSizeForType(element.type, allocations)));
  for(let i = 0; i < tuple.length; i++) {
    let head: Uint8Array;
    let tail: Uint8Array;
    if(!isElementDynamic[i]) {
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
