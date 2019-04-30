import debugModule from "debug";
const debug = debugModule("decoder:decode:stack");

import * as DecodeUtils from "truffle-decode-utils";
import read from "../read";
import decodeValue from "./value";
import { decodeExternalFunction } from "./value";
import { decodeMemoryReferenceByAddress } from "./memory";
import { decodeStorageReferenceByAddress } from "./storage";
import { decodeCalldataReferenceByAddress } from "./calldata";
import { StackPointer, StackLiteralPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest } from "../types/request";

export default function* decodeStack(definition: DecodeUtils.AstDefinition, pointer: StackPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  const rawValue: Uint8Array = yield* read(pointer, info.state);
  const literalPointer: StackLiteralPointer = { literal: rawValue };
  return yield* decodeLiteral(definition, literalPointer, info);
}

export function* decodeLiteral(definition: DecodeUtils.AstDefinition, pointer: StackLiteralPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {

  debug("definition %O", definition);
  debug("pointer %o", pointer);

  //first: do we have a memory pointer? if so we can just dispatch to
  //decodeMemoryReference, which knows how to decode the pointer already
  if(DecodeUtils.Definition.isReference(definition)
    && DecodeUtils.Definition.referenceType(definition) === "memory") {
    return yield* decodeMemoryReferenceByAddress(definition, pointer, info);
  }

  //next: do we have a storage pointer (which may be a mapping)? if so, we can
  //we dispatch to decodeStorageByAddress, a new function that will decode the
  //pointer and then dispatch to decodeStorageReference
  if((DecodeUtils.Definition.isReference(definition)
    && DecodeUtils.Definition.referenceType(definition) === "storage")
    || DecodeUtils.Definition.isMapping(definition)) {
    return yield* decodeStorageReferenceByAddress(definition, pointer, info);
  }

  //next: do we have a calldata pointer?
  if(DecodeUtils.Definition.isReference(definition)
    && DecodeUtils.Definition.referenceType(definition) === "calldata") {

    //if it's a string or bytes, we will interpret the pointer ourself and skip
    //straight to decodeValue.  this is to allow us to correctly handle the
    //case of msg.data used as a mapping key.
    if(DecodeUtils.Definition.typeClass(definition) === "string" ||
      DecodeUtils.Definition.typeClass(definition) === "bytes") {
      let start = DecodeUtils.Conversion.toBN(pointer.literal.slice(0, DecodeUtils.EVM.WORD_SIZE)).toNumber();
      let length = DecodeUtils.Conversion.toBN(pointer.literal.slice(DecodeUtils.EVM.WORD_SIZE)).toNumber();
      let newPointer = { calldata: { start, length }};
      return yield* decodeValue(definition, newPointer, info);
    }

    //otherwise, is it a dynamic array?
    if(DecodeUtils.Definition.isDynamicArray(definition)) {
      //in this case, we're actually going to *throw away* the length info,
      //because it makes the logic simpler -- we'll get the length info back
      //from calldata
      let locationOnly = pointer.literal.slice(0, DecodeUtils.EVM.WORD_SIZE);
      //HACK -- in order to read the correct location, we need to add an offset
      //of -32 (since, again, we're throwing away the length info), so we pass
      //that in as the "base" value
      return yield* decodeCalldataReferenceByAddress(definition, {literal: locationOnly}, info, -DecodeUtils.EVM.WORD_SIZE);
    }
    else {
      //multivalue case -- this case is straightforward
      //pass in 0 as the base since this is an absolute pointer
      return yield* decodeCalldataReferenceByAddress(definition, pointer, info, 0);
    }
  }

  //next: do we have an external function?  these work differently on the stack
  //than elsewhere, so we can't just pass it on to decodeValue.
  if(DecodeUtils.Definition.typeClass(definition) === "function"
    && DecodeUtils.Definition.visibility(definition) === "external") {
    let address = pointer.literal.slice(0, DecodeUtils.EVM.WORD_SIZE);
    let selector = pointer.literal.slice(-DecodeUtils.EVM.SELECTOR_SIZE);
    return yield* decodeExternalFunction(address, selector, info);
  }

  //finally, if none of the above hold, we can just dispatch to decodeValue.
  return yield* decodeValue(definition, pointer, info);
}
