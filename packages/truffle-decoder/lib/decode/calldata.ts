import debugModule from "debug";
const debug = debugModule("decoder:decode:calldata");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import { CalldataPointer, DataPointer } from "../types/pointer";
import { CalldataMemberAllocation } from "../types/allocation";
import { calldataSize } from "../allocate/calldata";
import { EvmInfo } from "../types/evm";
import { DecoderRequest } from "../types/request";

export default function* decodeCalldata(definition: DecodeUtils.AstDefinition, pointer: CalldataPointer, info: EvmInfo, base: number = 0): IterableIterator<any | DecoderRequest> {
  if(DecodeUtils.Definition.isReference(definition)) {
    let dynamic = calldataSize(definition, info.referenceDeclarations, info.calldataAllocations)[1];
    if(dynamic) {
      return yield* decodeCalldataReferenceByAddress(definition, pointer, info, base);
    }
    else {
      return yield* decodeCalldataReferenceStatic(definition, pointer, info);
    }
  }
  else {
    debug("pointer %o", pointer);
    return yield* decodeValue(definition, pointer, info);
  }
}

export function* decodeCalldataReferenceByAddress(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo, base: number = 0): IterableIterator<any | DecoderRequest> {
  const { state } = info;
  debug("pointer %o", pointer);
  let rawValue: Uint8Array = yield* read(pointer, state);

  let startPosition = DecodeUtils.Conversion.toBN(rawValue).toNumber() + base;
  debug("startPosition %d", startPosition);

  let [size, dynamic] = calldataSize(definition, info.referenceDeclarations, info.calldataAllocations);
  if(!dynamic) { //this will only come up when called from stack.ts
    let staticPointer = {
      calldata: {
        start: startPosition,
        length: size
      }
    }
    return yield* decodeCalldataReferenceStatic(definition, staticPointer, info);
  }
  let length;
  switch (DecodeUtils.Definition.typeClass(definition)) {

    case "bytes":
    case "string":
      length = DecodeUtils.Conversion.toBN(yield* read({
        calldata: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE}
      }, state)).toNumber(); //initial word contains length

      let childPointer: CalldataPointer = {
        calldata: { start: startPosition + DecodeUtils.EVM.WORD_SIZE, length }
      }

      return yield* decodeValue(definition, childPointer, info);

    case "array":

      if (DecodeUtils.Definition.isDynamicArray(definition)) {
        length = DecodeUtils.Conversion.toBN(yield* read({
          calldata: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE },
          }, state)).toNumber();  // initial word contains array length
        startPosition += DecodeUtils.EVM.WORD_SIZE; //increment startPosition to
        //next word, as first word was used for length
      }
      else {
        length = DecodeUtils.Definition.staticLength(definition);
      }

      //note: I've written this fairly generically, but it is worth noting that
      //since this array is of dynamic type, we know that if it's static length
      //then size must be EVM.WORD_SIZE

      let baseDefinition = definition.baseType || definition.typeName.baseType;
        //I'm deliberately not using the DecodeUtils function for this, because
        //we should *not* need a faked-up type here!

      // replace erroneous `_storage_` type identifiers with `_calldata_`
      baseDefinition = DecodeUtils.Definition.spliceLocation(baseDefinition, "calldata");
      let baseSize = calldataSize(baseDefinition, info.referenceDeclarations, info.calldataAllocations)[0];

      let decodedChildren = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(yield* decodeCalldata(
          baseDefinition,
          { calldata: {
            start: startPosition + index * baseSize,
            length: baseSize
          }},
          info, startPosition)); //pointer base is always start of list, never the length
      }
      return decodedChildren;

    case "struct":
      return yield* decodeCalldataStructByPosition(definition, startPosition, info);

    default:
      // debug("Unknown calldata reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;
  }
}

export function* decodeCalldataReferenceStatic(definition: DecodeUtils.AstDefinition, pointer: CalldataPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  const { state } = info;
  debug("static");
  debug("pointer %o", pointer);

  switch (DecodeUtils.Definition.typeClass(definition)) {

    case "array":

      //we're in the static case, so we know the array must be statically sized
      const length = DecodeUtils.Definition.staticLength(definition);
      let size = calldataSize(definition, info.referenceDeclarations, info.calldataAllocations)[0];

      let baseDefinition = definition.baseType || definition.typeName.baseType;
        //I'm deliberately not using the DecodeUtils function for this, because
        //we should *not* need a faked-up type here!

      // replace erroneous `_storage_` type identifiers with `_calldata_`
      baseDefinition = DecodeUtils.Definition.spliceLocation(baseDefinition, "calldata");
      let baseSize = calldataSize(baseDefinition, info.referenceDeclarations, info.calldataAllocations)[0];

      let decodedChildren = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(yield* decodeCalldata(
          baseDefinition,
          { calldata: {
            start: pointer.calldata.start + index * baseSize,
            length: baseSize
          }},
          info)); //static case so don't need base
      }
      return decodedChildren;

    case "struct":
      return yield* decodeCalldataStructByPosition(definition, pointer.calldata.start, info);

    default:
      // debug("Unknown calldata reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;
  }
}

//note that this function takes the start position as a *number*; it does not take a calldata pointer
function* decodeCalldataStructByPosition(definition: DecodeUtils.AstDefinition, startPosition: number, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  const { state, referenceDeclarations, calldataAllocations } = info;

  const referencedDeclaration = definition.typeName
    ? definition.typeName.referencedDeclaration
    : definition.referencedDeclaration;
  const structAllocation = calldataAllocations[referencedDeclaration];

  if(structAllocation == null) {
    return undefined; //this should never happen
  }

  let decodedMembers: any = {};
  for(let memberAllocation of Object.values(structAllocation.members)) {
    const memberPointer = memberAllocation.pointer;
    const childPointer: CalldataPointer = {
      calldata: {
        start: startPosition + memberPointer.calldata.start,
        length: memberPointer.calldata.length
      }
    };

    let memberDefinition = memberAllocation.definition;

    // replace erroneous `_storage` type identifiers with `_calldata`
    memberDefinition = DecodeUtils.Definition.spliceLocation(memberDefinition, "calldata");
    //there also used to be code here to add on the "_ptr" ending when absent, but we
    //presently ignore that ending, so we'll skip that

    let decoded = yield* decodeCalldata(memberDefinition, childPointer, info, startPosition);
    //note that startPosition is only needed in the dynamic case, but we don't know which case we're in

    decodedMembers[memberDefinition.name] = decoded;
  }
  return decodedMembers;
}
