import debugModule from "debug";
const debug = debugModule("codec:memory:decode");

import BN from "bn.js";
import read from "@truffle/codec/read";
import * as Conversion from "@truffle/codec/conversion";
import * as Format from "@truffle/codec/format";
import * as Basic from "@truffle/codec/basic";
import * as Bytes from "@truffle/codec/bytes";
import * as Pointer from "@truffle/codec/pointer";
import { DecoderRequest, DecoderOptions } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";
import { isSkippedInMemoryStructs } from "@truffle/codec/memory/allocate";
import { DecodingError } from "@truffle/codec/errors";

export function* decodeMemory(
  dataType: Format.Types.Type,
  pointer: Pointer.MemoryPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  if (Format.Types.isReferenceType(dataType)) {
    if (isSkippedInMemoryStructs(dataType)) {
      //special case; these types are always empty in memory
      return decodeMemorySkippedType(dataType);
    } else {
      return yield* decodeMemoryReferenceByAddress(
        dataType,
        pointer,
        info,
        options
      );
    }
  } else {
    return yield* Basic.Decode.decodeBasic(dataType, pointer, info, options);
  }
}

function decodeMemorySkippedType(
  dataType: Format.Types.Type
): Format.Values.Result {
  switch (dataType.typeClass) {
    case "mapping":
      return {
        type: dataType,
        kind: "value" as const,
        value: []
      };
    case "array":
      return {
        type: dataType,
        kind: "value" as const,
        value: []
      };
    //other cases should not arise!
  }
}

export function* decodeMemoryReferenceByAddress(
  dataType: Format.Types.ReferenceType,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  const { state } = info;
  const memoryVisited = options.memoryVisited || [];
  debug("pointer %o", pointer);
  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, state);
  } catch (error) {
    if (error instanceof DecodingError) {
      return <Format.Errors.ErrorResult>{
        //dunno why TS is failing here
        type: dataType,
        kind: "error" as const,
        error: error.error
      };
    } else {
      throw error;
    }
  }

  let startPositionAsBN = Conversion.toBN(rawValue);
  let startPosition: number;
  try {
    startPosition = startPositionAsBN.toNumber();
  } catch (_) {
    return <Format.Errors.ErrorResult>{
      //again with the TS failures...
      type: dataType,
      kind: "error" as const,
      error: {
        kind: "OverlargePointersNotImplementedError" as const,
        pointerAsBN: startPositionAsBN
      }
    };
  }
  //startPosition may get modified later, so let's save the current
  //value for circularity detection purposes
  const objectPosition = startPosition;
  let rawLength: Uint8Array;
  let lengthAsBN: BN;
  let length: number;
  let seenPreviously: number;

  switch (dataType.typeClass) {
    case "bytes":
    case "string":
      //initial word contains length
      try {
        rawLength = yield* read(
          {
            location: "memory" as const,
            start: startPosition,
            length: Evm.Utils.WORD_SIZE
          },
          state
        );
      } catch (error) {
        if (error instanceof DecodingError) {
          return <Format.Errors.ErrorResult>{
            //dunno why TS is failing here
            type: dataType,
            kind: "error" as const,
            error: error.error
          };
        } else {
          throw error;
        }
      }
      lengthAsBN = Conversion.toBN(rawLength);
      try {
        length = lengthAsBN.toNumber();
      } catch (_) {
        return <
          | Format.Errors.BytesDynamicErrorResult
          | Format.Errors.StringErrorResult
        >{
          //again with the TS failures...
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
        start: startPosition + Evm.Utils.WORD_SIZE,
        length
      };

      return yield* Bytes.Decode.decodeBytes(dataType, childPointer, info);

    case "array": {
      //first: circularity check!
      seenPreviously = memoryVisited.indexOf(objectPosition);
      if (seenPreviously !== -1) {
        return {
          type: dataType,
          kind: "value" as const,
          reference: seenPreviously + 1,
          value: [] //will be fixed later by the tie function
        };
      }
      //otherwise, decode as normal
      if (dataType.kind === "dynamic") {
        //initial word contains array length
        try {
          rawLength = yield* read(
            {
              location: "memory" as const,
              start: startPosition,
              length: Evm.Utils.WORD_SIZE
            },
            state
          );
        } catch (error) {
          if (error instanceof DecodingError) {
            return {
              type: dataType,
              kind: "error" as const,
              error: error.error
            };
          } else {
            throw error;
          }
        }
        lengthAsBN = Conversion.toBN(rawLength);
        startPosition += Evm.Utils.WORD_SIZE; //increment startPosition
        //to next word, as first word was used for length
      } else {
        lengthAsBN = dataType.length;
      }
      try {
        length = lengthAsBN.toNumber();
      } catch (_) {
        return {
          type: dataType,
          kind: "error" as const,
          error: {
            kind: "OverlongArraysAndStringsNotImplementedError" as const,
            lengthAsBN
          }
        };
      }

      let memoryNowVisited = [objectPosition, ...memoryVisited];

      let baseType = dataType.baseType;
      let decodedChildren: Format.Values.Result[] = [];
      for (let index = 0; index < length; index++) {
        decodedChildren.push(
          yield* decodeMemory(
            baseType,
            {
              location: "memory" as const,
              start: startPosition + index * Evm.Utils.WORD_SIZE,
              length: Evm.Utils.WORD_SIZE
            },
            info,
            { memoryVisited: memoryNowVisited }
          )
        );
      }

      return {
        type: dataType,
        kind: "value" as const,
        value: decodedChildren
      };
    }

    case "struct": {
      //first: circularity check!
      seenPreviously = memoryVisited.indexOf(objectPosition);
      if (seenPreviously !== -1) {
        return {
          type: dataType,
          kind: "value" as const,
          reference: seenPreviously + 1,
          value: [] //will be fixed later by the tie function
        };
      }
      //otherwise, decode as normal
      const {
        allocations: { memory: allocations }
      } = info;

      const typeId = dataType.id;
      const structAllocation = allocations[typeId];
      if (!structAllocation) {
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

      let memoryNowVisited = [objectPosition, ...memoryVisited];
      let decodedMembers: Format.Values.NameValuePair[] = [];
      for (let index = 0; index < structAllocation.members.length; index++) {
        const memberAllocation = structAllocation.members[index];
        const memberPointer = memberAllocation.pointer;
        const childPointer: Pointer.MemoryPointer = {
          location: "memory" as const,
          start: startPosition + memberPointer.start,
          length: memberPointer.length //always equals WORD_SIZE or 0
        };

        let memberName = memberAllocation.name;
        let memberType = Format.Types.specifyLocation(
          memberAllocation.type,
          "memory"
        );

        decodedMembers.push({
          name: memberName,
          value: yield* decodeMemory(memberType, childPointer, info, {
            memoryVisited: memoryNowVisited
          })
        });
      }
      return {
        type: dataType,
        kind: "value" as const,
        value: decodedMembers
      };
    }
  }
}
