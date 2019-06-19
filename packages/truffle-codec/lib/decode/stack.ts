import debugModule from "debug";
const debug = debugModule("decoder-core:decode:stack");

import * as DecodeUtils from "truffle-decode-utils";
import { Types, Values } from "truffle-decode-utils";
import read from "../read";
import decodeValue from "./value";
import { decodeExternalFunction, checkPaddingLeft } from "./value";
import { decodeMemoryReferenceByAddress } from "./memory";
import { decodeStorageReferenceByAddress } from "./storage";
import { decodeAbiReferenceByAddress } from "./abi";
import { StackPointer, StackLiteralPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decodeStack(dataType: Types.Type, pointer: StackPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  let rawValue: Uint8Array;
  try {
   rawValue = yield* read(pointer, info.state);
  }
  catch(error) { //error: Values.DecodingError
    return Values.makeGenericErrorResult(dataType, error.error);
  }
  const literalPointer: StackLiteralPointer = { location: "stackliteral", literal: rawValue };
  return yield* decodeLiteral(dataType, literalPointer, info);
}

export function* decodeLiteral(dataType: Types.Type, pointer: StackLiteralPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {

  debug("type %O", dataType);
  debug("pointer %o", pointer);

  if(Types.isReferenceType(dataType)) {
    switch(dataType.location) {
      case "memory":
        //first: do we have a memory pointer? if so we can just dispatch to
        //decodeMemoryReference
        return yield* decodeMemoryReferenceByAddress(dataType, pointer, info);

      case "storage":
        //next: do we have a storage pointer (which may be a mapping)? if so, we can
        //we dispatch to decodeStorageByAddress
        return yield* decodeStorageReferenceByAddress(dataType, pointer, info);

      case "calldata":
        //next: do we have a calldata pointer?

        //if it's a string or bytes, we will interpret the pointer ourself and skip
        //straight to decodeValue.  this is to allow us to correctly handle the
        //case of msg.data used as a mapping key.
        if(dataType.typeClass === "bytes" || dataType.typeClass === "string") {
          let start = DecodeUtils.Conversion.toBN(pointer.literal.slice(0, DecodeUtils.EVM.WORD_SIZE)).toNumber();
          let length = DecodeUtils.Conversion.toBN(pointer.literal.slice(DecodeUtils.EVM.WORD_SIZE)).toNumber();
          let newPointer = { location: "calldata" as "calldata", start, length };
          return yield* decodeValue(dataType, newPointer, info);
        }

        //otherwise, is it a dynamic array?
        if(dataType.typeClass === "array" && dataType.kind === "dynamic") {
          //in this case, we're actually going to *throw away* the length info,
          //because it makes the logic simpler -- we'll get the length info back
          //from calldata
          let locationOnly = pointer.literal.slice(0, DecodeUtils.EVM.WORD_SIZE);
          //HACK -- in order to read the correct location, we need to add an offset
          //of -32 (since, again, we're throwing away the length info), so we pass
          //that in as the "base" value
          return yield* decodeAbiReferenceByAddress(dataType, {location: "stackliteral", literal: locationOnly}, info, -DecodeUtils.EVM.WORD_SIZE);
        }
        else {
          //multivalue case -- this case is straightforward
          //pass in 0 as the base since this is an absolute pointer
          return yield* decodeAbiReferenceByAddress(dataType, pointer, info, 0);
        }
    }
  }

  //next: do we have an external function?  these work differently on the stack
  //than elsewhere, so we can't just pass it on to decodeValue.
  if(dataType.typeClass === "function" && dataType.visibility === "external") {
    let address = pointer.literal.slice(0, DecodeUtils.EVM.WORD_SIZE);
    let selectorWord = pointer.literal.slice(-DecodeUtils.EVM.WORD_SIZE);
    if(!checkPaddingLeft(address, DecodeUtils.EVM.ADDRESS_SIZE)
      ||!checkPaddingLeft(selectorWord, DecodeUtils.EVM.SELECTOR_SIZE)) {
      return new Values.FunctionExternalErrorResult(
        dataType,
        new Values.FunctionExternalStackPaddingError(
          DecodeUtils.Conversion.toHexString(address),
          DecodeUtils.Conversion.toHexString(selectorWord)
        )
      );
    }
    let selector = selectorWord.slice(-DecodeUtils.EVM.SELECTOR_SIZE);
    return new Values.FunctionExternalValue(
      dataType,
      <Values.FunctionExternalValueInfo> (yield* decodeExternalFunction(address, selector, info))
    );
  }

  //finally, if none of the above hold, we can just dispatch to decodeValue.
  //however, note that because we're on the stack, we use the permissive padding
  //option so that errors won't result due to values with bad padding
  //(of numeric or bytesN type, anyway)
  return yield* decodeValue(dataType, pointer, info, true);
}
