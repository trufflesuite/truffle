import debugModule from "debug";
const debug = debugModule("decoder:decode:memory");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import decodeValue from "./value";
import { MemoryPointer, DataPointer } from "../types/pointer";
import { MemoryMemberAllocation } from "../types/allocation";
import { EvmInfo } from "../types/evm";
import { DecoderRequest } from "../types/request";

export default function* decodeMemory(definition: DecodeUtils.AstDefinition, pointer: MemoryPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  if(DecodeUtils.Definition.isReference(definition)) {
    return yield* decodeMemoryReferenceByAddress(definition, pointer, info);
  }
  else {
    return yield* decodeValue(definition, pointer, info);
  }
}

export function* decodeMemoryReferenceByAddress(definition: DecodeUtils.AstDefinition, pointer: DataPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  const { state } = info;
  // debug("pointer %o", pointer);
  let rawValue: Uint8Array = yield* read(pointer, state);

  let startPosition = DecodeUtils.Conversion.toBN(rawValue).toNumber();
  let length;

  switch (DecodeUtils.Definition.typeClass(definition)) {

    case "bytes":
    case "string":
      length = DecodeUtils.Conversion.toBN(yield* read({
        memory: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE}
      }, state)).toNumber(); //initial word contains length

      let childPointer: MemoryPointer = {
        memory: { start: startPosition + DecodeUtils.EVM.WORD_SIZE, length }
      }

      return yield* decodeValue(definition, childPointer, info);

    case "array":

      if (DecodeUtils.Definition.isDynamicArray(definition)) {
        length = DecodeUtils.Conversion.toBN(yield* read({
          memory: { start: startPosition, length: DecodeUtils.EVM.WORD_SIZE },
          }, state)).toNumber();  // initial word contains array length
        startPosition += DecodeUtils.EVM.WORD_SIZE; //increment startPosition to
        //next word, as first word was used for length
      }
      else {
        length = DecodeUtils.Definition.staticLength(definition);
      }

      let baseDefinition = definition.baseType || definition.typeName.baseType;
        //I'm deliberately not using the DecodeUtils function for this, because
        //we should *not* need a faked-up type here!

      // replace erroneous `_storage_` type identifiers with `_memory_`
      baseDefinition = DecodeUtils.Definition.spliceLocation(baseDefinition, "memory");

      let decodedChildren = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(yield* decodeMemory(
          baseDefinition,
          { memory: {
            start: startPosition + index * DecodeUtils.EVM.WORD_SIZE,
            length: DecodeUtils.EVM.WORD_SIZE
          }},
          info));
      }
      return decodedChildren;

    case "struct":
      const { referenceDeclarations, memoryAllocations } = info;

      const referencedDeclaration = definition.typeName
        ? definition.typeName.referencedDeclaration
        : definition.referencedDeclaration;
      const structAllocation = memoryAllocations[referencedDeclaration];

      debug("structAllocation %O", structAllocation);

      let decodedMembers: any = {};
      for(let memberAllocation of Object.values(structAllocation.members)) {
        const memberPointer = memberAllocation.pointer;
        const childPointer: MemoryPointer = {
          memory: {
            start: startPosition + memberPointer.memory.start,
            length: memberPointer.memory.length //always equals WORD_SIZE
          }
        };

        let memberDefinition = memberAllocation.definition;

        // replace erroneous `_storage` type identifiers with `_memory`
        memberDefinition = DecodeUtils.Definition.spliceLocation(memberDefinition, "memory");
        //there also used to be code here to add on the "_ptr" ending when absent, but we
        //presently ignore that ending, so we'll skip that

        let decoded = yield* decodeMemory(memberDefinition, childPointer, info);

        decodedMembers[memberDefinition.name] = decoded;
      }
      return decodedMembers;

    default:
      // debug("Unknown memory reference type: %s", DecodeUtils.typeIdentifier(definition));
      return undefined;

  }

}
