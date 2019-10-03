import debugModule from "debug";
const debug = debugModule("codec:decode:memory");

import BN from "bn.js";
import read from "@truffle/codec/read";
import * as CodecUtils from "@truffle/codec/utils";
import { TypeUtils } from "@truffle/codec/utils";
import { Types, Values, Errors } from "@truffle/codec/format";
import decodeValue from "./value";
import { Pointer } from "@truffle/codec/types";
import { MemoryMemberAllocation } from "@truffle/codec/types/allocation";
import { EvmInfo } from "@truffle/codec/types/evm";
import { DecoderRequest } from "@truffle/codec/types/request";
import { DecodingError } from "@truffle/codec/decode/errors";

export default function* decodeMemory(dataType: Types.Type, pointer: Pointer.MemoryPointer, info: EvmInfo): Generator<DecoderRequest, Values.Result, Uint8Array> {
  if(TypeUtils.isReferenceType(dataType)) {
    return yield* decodeMemoryReferenceByAddress(dataType, pointer, info);
  }
  else {
    return yield* decodeValue(dataType, pointer, info);
  }
}

export function* decodeMemoryReferenceByAddress(dataType: Types.ReferenceType, pointer: Pointer.DataPointer, info: EvmInfo): Generator<DecoderRequest, Values.Result, Uint8Array> {
  const { state } = info;
  // debug("pointer %o", pointer);
  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, state);
  }
  catch(error) {
    return <Errors.ErrorResult> { //dunno why TS is failing here
      type: dataType,
      kind: "error" as const,
      error: (<DecodingError>error).error
    };
  }

  let startPositionAsBN = CodecUtils.Conversion.toBN(rawValue);
  let startPosition: number;
  try {
    startPosition = startPositionAsBN.toNumber();
  }
  catch(_) {
    return <Errors.ErrorResult> { //again with the TS failures...
      type: dataType,
      kind: "error" as const,
      error: {
        kind: "OverlargePointersNotImplementedError" as const,
        pointerAsBN: startPositionAsBN
      }
    };
  }
  let rawLength: Uint8Array;
  let lengthAsBN: BN;
  let length: number;

  switch (dataType.typeClass) {

    case "bytes":
    case "string":
      //initial word contains length
      try {
        rawLength = yield* read({
          location: "memory" as const,
          start: startPosition,
          length: CodecUtils.EVM.WORD_SIZE
        }, state);
      }
      catch(error) {
        return <Errors.ErrorResult> { //dunno why TS is failing here
          type: dataType,
          kind: "error" as const,
          error: (<DecodingError>error).error
        };
      }
      lengthAsBN = CodecUtils.Conversion.toBN(rawLength);
      try {
        length = lengthAsBN.toNumber();
      }
      catch(_) {
        return <Errors.BytesDynamicErrorResult|Errors.StringErrorResult> { //again with the TS failures...
          type: dataType,
          kind: "error" as const,
          error: {
            kind: "OverlongArraysAndStringsNotImplementedError" as const,
            lengthAsBN
          }
        };
      }

      let childPointer: Pointer.MemoryPointer = {
        location: "memory" as const,
        start: startPosition + CodecUtils.EVM.WORD_SIZE,
        length
      };

      return yield* decodeValue(dataType, childPointer, info);

    case "array":

      if (dataType.kind === "dynamic") {
        //initial word contains array length
        try {
          rawLength = yield* read({
            location: "memory" as const,
            start: startPosition,
            length: CodecUtils.EVM.WORD_SIZE
          }, state);
        }
        catch(error) {
          return {
            type: dataType,
            kind: "error" as const,
            error: (<DecodingError>error).error
          };
        }
        lengthAsBN = CodecUtils.Conversion.toBN(rawLength);
        startPosition += CodecUtils.EVM.WORD_SIZE; //increment startPosition
        //to next word, as first word was used for length
      }
      else {
        lengthAsBN = dataType.length;
      }
      try {
        length = lengthAsBN.toNumber();
      }
      catch(_) {
        return {
          type: dataType,
          kind: "error" as const,
          error: {
            kind: "OverlongArraysAndStringsNotImplementedError" as const,
            lengthAsBN
          }
        };
      }

      let baseType = dataType.baseType;

      let decodedChildren: Values.Result[] = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(
          yield* decodeMemory(
            baseType,
            {
              location: "memory" as const,
              start: startPosition + index * CodecUtils.EVM.WORD_SIZE,
              length: CodecUtils.EVM.WORD_SIZE
            },
            info
          )
        );
      }

      return {
        type: dataType,
        kind: "value" as const,
        value: decodedChildren
      };

    case "struct":
      const { allocations: { memory: allocations }, userDefinedTypes } = info;

      const typeId = dataType.id;
      const structAllocation = allocations[parseInt(typeId)];
      if(!structAllocation) {
        return {
          type: dataType,
          kind: "error" as const,
          error: {
            kind: "UserDefinedTypeNotFoundError" as const,
            type: dataType
          }
        };
      }

      debug("structAllocation %O", structAllocation);

      let decodedMembers: Values.NameValuePair[] = [];
      for(let index = 0; index < structAllocation.members.length; index++) {
        const memberAllocation = structAllocation.members[index];
        const memberPointer = memberAllocation.pointer;
        const childPointer: Pointer.MemoryPointer = {
          location: "memory" as const,
          start: startPosition + memberPointer.start,
          length: memberPointer.length //always equals WORD_SIZE or 0
        };

        let memberName = memberAllocation.definition.name;
        let storedType = <Types.StructType>userDefinedTypes[typeId];
        if(!storedType) {
          return <Errors.ErrorResult> { //dunno why TS is failing here
            type: dataType,
            kind: "error" as const,
            error: {
              kind: "UserDefinedTypeNotFoundError",
              type: dataType
            }
          };
        }
        let storedMemberType = storedType.memberTypes[index].type;
        let memberType = TypeUtils.specifyLocation(storedMemberType, "memory");

        decodedMembers.push({
          name: memberName,
          value: yield* decodeMemory(memberType, childPointer, info)
        });
      }
      return {
        type: dataType,
        kind: "value" as const,
        value: decodedMembers
      };

    case "mapping":
      //a mapping in memory is always empty
      return {
        type: dataType,
        kind: "value" as const,
        value: []
      };
  }
}
