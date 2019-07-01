import debugModule from "debug";
const debug = debugModule("decoder:decode:memory");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import { Types, Values } from "truffle-decode-utils";
import decodeValue from "./value";
import { MemoryPointer, DataPointer } from "../types/pointer";
import { MemoryMemberAllocation } from "../types/allocation";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decodeMemory(dataType: Types.Type, pointer: MemoryPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  if(Types.isReferenceType(dataType)) {
    return yield* decodeMemoryReferenceByAddress(dataType, pointer, info);
  }
  else {
    return yield* decodeValue(dataType, pointer, info);
  }
}

export function* decodeMemoryReferenceByAddress(dataType: Types.ReferenceType, pointer: DataPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  const { state } = info;
  // debug("pointer %o", pointer);
  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, state);
  }
  catch(error) { //error: Values.DecodingError
    return Values.makeGenericErrorResult(dataType, error.error);
  }

  let startPosition = DecodeUtils.Conversion.toBN(rawValue).toNumber();
  let rawLength: Uint8Array;
  let length: number;

  switch (dataType.typeClass) {

    case "bytes":
    case "string":
      //initial word contains length
      try {
        rawLength = yield* read({
          memory: {
            start: startPosition,
            length: DecodeUtils.EVM.WORD_SIZE
          }
        }, state);
      }
      catch(error) { //error: Values.DecodingError
        return Values.makeGenericErrorResult(dataType, error.error);
      }
      length = DecodeUtils.Conversion.toBN(rawLength).toNumber();

      let childPointer: MemoryPointer = {
        memory: { start: startPosition + DecodeUtils.EVM.WORD_SIZE, length }
      }

      return yield* decodeValue(dataType, childPointer, info);

    case "array":

      if (dataType.kind === "dynamic") {
        //initial word contains array length
        try {
          rawLength = yield* read({
            memory: {
              start: startPosition,
              length: DecodeUtils.EVM.WORD_SIZE
            }
          }, state);
        }
        catch(error) { //error: Values.DecodingError
          return Values.makeGenericErrorResult(dataType, error.error);
        }
        length = DecodeUtils.Conversion.toBN(rawLength).toNumber();
        startPosition += DecodeUtils.EVM.WORD_SIZE; //increment startPosition
        //to next word, as first word was used for length
      }
      else {
        length = dataType.length.toNumber();
      }

      let baseType = dataType.baseType;

      let decodedChildren: Values.Result[] = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(
          <Values.Result> (yield* decodeMemory(
            baseType,
            { memory: {
              start: startPosition + index * DecodeUtils.EVM.WORD_SIZE,
              length: DecodeUtils.EVM.WORD_SIZE
            }},
            info
          ))
        );
      }

      return new Values.ArrayValue(dataType, decodedChildren);

    case "struct":
      const { memoryAllocations, userDefinedTypes } = info;

      const typeId = dataType.id;
      const structAllocation = memoryAllocations[typeId];
      if(!structAllocation) {
        return new Values.StructErrorResult(
          dataType,
          new Values.UserDefinedTypeNotFoundError(dataType)
        );
      }

      debug("structAllocation %O", structAllocation);

      let decodedMembers: {name: string, value: Values.Result}[] = [];
      for(let index = 0; index < structAllocation.members.length; index++) {
        const memberAllocation = structAllocation.members[index];
        const memberPointer = memberAllocation.pointer;
        if(!memberPointer) {
          continue; //memberPointer may be null due to mappings; skip these
        }
        const childPointer: MemoryPointer = {
          memory: {
            start: startPosition + memberPointer.memory.start,
            length: memberPointer.memory.length //always equals WORD_SIZE
          }
        };

        let memberName = memberAllocation.definition.name;
        let storedType = <Types.StructType>userDefinedTypes[typeId];
        if(!storedType) {
          return new Values.StructErrorResult(
            dataType,
            new Values.UserDefinedTypeNotFoundError(dataType)
          );
        }
        let storedMemberType = storedType.memberTypes[index].type;
        let memberType = Types.specifyLocation(storedMemberType, "memory");

        decodedMembers.push({
          name: memberName,
          value: <Values.Result> (yield* decodeMemory(memberType, childPointer, info))
        });
      }
      return new Values.StructValue(dataType, decodedMembers);
  }
}
