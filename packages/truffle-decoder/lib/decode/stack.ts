import debugModule from "debug";
const debug = debugModule("decoder:decode:stack");

import * as DecodeUtils from "truffle-decode-utils";
import read from "../read";
import decodeValue from "./value";
import { decodeMemoryReferenceByAddress } from "./memory";
import { decodeStorageReferenceByAddress } from "./storage";
import { decodeCalldataReferenceByAddress } from "./calldata";
import { StackPointer, StackLiteralPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import Web3 from "web3";

export async function decodeStack(definition: DecodeUtils.AstDefinition, pointer: StackPointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise <any> {
  const rawValue: Uint8Array = await read(pointer, info.state, web3, contractAddress);
  const literalPointer: StackLiteralPointer = { literal: rawValue };
  return await decodeLiteral(definition, literalPointer, info, web3, contractAddress);
}

export async function decodeLiteral(definition: DecodeUtils.AstDefinition, pointer: StackLiteralPointer, info: EvmInfo, web3?: Web3, contractAddress?: string): Promise <any> {

  debug("definition %O", definition);
  debug("pointer %o", pointer);

  //first: do we have a memory pointer? if so we can just dispatch to
  //decodeMemoryReference, which knows how to decode the pointer already
  if(DecodeUtils.Definition.isReference(definition)
    && DecodeUtils.Definition.referenceType(definition) === "memory") {
    return await decodeMemoryReferenceByAddress(definition, pointer, info);
  }

  //next: do we have a storage pointer (which may be a mapping)? if so, we can
  //we dispatch to decodeStorageByAddress, a new function that will decode the
  //pointer and then dispatch to decodeStorageReference
  if((DecodeUtils.Definition.isReference(definition)
    && DecodeUtils.Definition.referenceType(definition) === "storage")
    || DecodeUtils.Definition.isMapping(definition)) {
    return await decodeStorageReferenceByAddress(definition, pointer, info, web3, contractAddress);
  }

  //next: do we have a calldata pointer?
  if(DecodeUtils.Definition.isReference(definition)
    && DecodeUtils.Definition.referenceType(definition) === "calldata") {
    //is it a lookup type or a multivalue type?
    if(DecodeUtils.Definition.isDynamicArray(definition) ||
      DecodeUtils.Definition.typeClass(definition) === "string" ||
      DecodeUtils.Definition.typeClass(definition) === "bytes") {
      //lookup case
      //in this case, we're actually going to *throw away* the length info,
      //because it makes the logic simpler -- we'll get the length info back
      //from calldata
      let locationOnly = pointer.literal.slice(0, DecodeUtils.EVM.WORD_SIZE);
      //HACK -- in order to read the correct location, we need to add an offset
      //of -32 (since, again, we're throwing away the length info), so we pass
      //that in as the "base" value
      return await decodeCalldataReferenceByAddress(definition, {literal: locationOnly}, info, -DecodeUtils.EVM.WORD_SIZE);
    }
    else {
      //multivalue case -- this case is straightforward
      //pass in 0 as the base since this is an absolute pointer
      return await decodeCalldataReferenceByAddress(definition, pointer, info, 0);
    }
  }

  //next: do we have an external function?  these work differently on the stack
  //than elsewhere, so we can't just pass it on to decodeValue.  However, we
  //don't yet support this case, so let's just move on

  //finally, if none of the above hold, we can just dispatch to decodeValue.
  //note we don't need web3 and contract address at this point
  return await decodeValue(definition, pointer, info);
}
