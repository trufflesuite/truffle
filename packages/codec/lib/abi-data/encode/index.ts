import debugModule from "debug";
const debug = debugModule("codec:abi-data:encode");

import * as Format from "@truffle/codec/format";
import * as Conversion from "@truffle/codec/conversion";
import * as Basic from "@truffle/codec/basic";
import * as Bytes from "@truffle/codec/bytes";
import * as Evm from "@truffle/codec/evm";
import {
  AbiAllocations,
  AbiSizeInfo,
  abiSizeInfo
} from "@truffle/codec/abi-data/allocate";
import sum from "lodash.sum";

//UGH -- it turns out TypeScript can't handle nested tagged unions
//see: https://github.com/microsoft/TypeScript/issues/18758
//so, I'm just going to have to throw in a bunch of type coercions >_>

/**
 * @Category Encoding (low-level)
 */
export function encodeAbi(
  input: Format.Values.Result,
  allocations?: AbiAllocations
): Uint8Array | undefined {
  //errors can't be encoded
  if (input.kind === "error") {
    return undefined;
  }
  let bytes: Uint8Array;
  //TypeScript can at least infer in the rest of this that we're looking
  //at a value, not an error!  But that's hardly enough...
  switch (input.type.typeClass) {
    case "mapping":
    case "magic":
    case "type":
      //none of these can go in the ABI
      return undefined;
    case "bytes":
      switch (input.type.kind) {
        case "static":
          return Basic.Encode.encodeBasic(input);
        case "dynamic":
          bytes = Bytes.Encode.encodeBytes(<Format.Values.BytesDynamicValue>(
            input
          ));
          return padAndPrependLength(bytes);
      }
    case "string":
      bytes = Bytes.Encode.encodeBytes(<Format.Values.BytesDynamicValue>input);
      return padAndPrependLength(bytes);
    case "function": {
      switch (input.type.visibility) {
        case "internal":
          return undefined; //internal functions can't go in the ABI!
        //Yes, technically we could defer to encodeBasic here, but,
        //c'mon, that's not how the function's supposed to be used
        case "external":
          return Basic.Encode.encodeBasic(input);
      }
    }
    //now for the serious cases
    case "array": {
      let coercedInput: Format.Values.ArrayValue = <Format.Values.ArrayValue>(
        input
      );
      if (coercedInput.reference !== undefined) {
        return undefined; //circular values can't be encoded
      }
      let staticEncoding = encodeTupleAbi(coercedInput.value, allocations);
      switch (input.type.kind) {
        case "static":
          return staticEncoding;
        case "dynamic":
          let encoded = new Uint8Array(
            Evm.Utils.WORD_SIZE + staticEncoding.length
          ); //leave room for length
          encoded.set(staticEncoding, Evm.Utils.WORD_SIZE); //again, leave room for length beforehand
          let lengthBytes = Conversion.toBytes(
            coercedInput.value.length,
            Evm.Utils.WORD_SIZE
          );
          encoded.set(lengthBytes); //and now we set the length
          return encoded;
      }
    }
    case "struct": {
      let coercedInput: Format.Values.StructValue = <Format.Values.StructValue>(
        input
      );
      if (coercedInput.reference !== undefined) {
        return undefined; //circular values can't be encoded
      }
      return encodeTupleAbi(
        coercedInput.value.map(({ value }) => value),
        allocations
      );
    }
    case "tuple":
      //WARNING: This case is written in a way that involves a bunch of unnecessary recomputation!
      //(That may not be apparent from this one line, but it's true)
      //I'm writing it this way anyway for simplicity, to avoid rewriting the encoder
      //However it may be worth revisiting this in the future if performance turns out to be a problem
      return encodeTupleAbi(
        (<Format.Values.TupleValue>input).value.map(({ value }) => value),
        allocations
      );
    default:
      return Basic.Encode.encodeBasic(input);
  }
}

/**
 * @Category Encoding (low-level)
 */
function padAndPrependLength(bytes: Uint8Array): Uint8Array {
  let length = bytes.length;
  let paddedLength =
    Evm.Utils.WORD_SIZE * Math.ceil(length / Evm.Utils.WORD_SIZE);
  let encoded = new Uint8Array(Evm.Utils.WORD_SIZE + paddedLength);
  encoded.set(bytes, Evm.Utils.WORD_SIZE); //start 32 in to leave room for the length beforehand
  let lengthBytes = Conversion.toBytes(length, Evm.Utils.WORD_SIZE);
  encoded.set(lengthBytes); //and now we set the length
  return encoded;
}

/**
 * @Category Encoding (low-level)
 */
export function encodeTupleAbi(
  tuple: Format.Values.Result[],
  allocations?: AbiAllocations
): Uint8Array | undefined {
  let elementEncodings = tuple.map(element => encodeAbi(element, allocations));
  if (elementEncodings.some(element => element === undefined)) {
    return undefined;
  }
  let elementSizeInfo: AbiSizeInfo[] = tuple.map(element =>
    abiSizeInfo(element.type, allocations)
  );
  //heads and tails here are as discussed in the ABI docs;
  //for a static type the head is the encoding and the tail is empty,
  //for a dynamic type the head is the pointer and the tail is the encoding
  let heads: Uint8Array[] = [];
  let tails: Uint8Array[] = [];
  //but first, we need to figure out where the first tail will start,
  //by adding up the sizes of all the heads (we can easily do this in
  //advance via elementSizeInfo, without needing to know the particular
  //values of the heads)
  let startOfNextTail = sum(
    elementSizeInfo.map(elementInfo => elementInfo.size)
  );
  for (let i = 0; i < tuple.length; i++) {
    let head: Uint8Array;
    let tail: Uint8Array;
    if (!elementSizeInfo[i].dynamic) {
      //static case
      head = elementEncodings[i];
      tail = new Uint8Array(); //empty array
    } else {
      //dynamic case
      head = Conversion.toBytes(startOfNextTail, Evm.Utils.WORD_SIZE);
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
  for (let head of heads) {
    encoded.set(head, position);
    position += head.length;
  }
  for (let tail of tails) {
    encoded.set(tail, position);
    position += tail.length;
  }
  return encoded;
}

/**
 * @Category Encoding (low-level)
 */
export function encodeTupleAbiWithSelector(
  tuple: Format.Values.Result[],
  selector: Uint8Array,
  allocations?: AbiAllocations
): Uint8Array | undefined {
  const encodedTuple = encodeTupleAbi(tuple, allocations);
  if (!encodedTuple) {
    return undefined;
  }
  const encoded = new Uint8Array(selector.length + encodedTuple.length);
  encoded.set(selector);
  encoded.set(encodedTuple, selector.length);
  return encoded;
}
