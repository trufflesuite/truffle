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
import { DecodingError } from "@truffle/codec/errors";

export function* decodeMemory(
  dataType: Format.Types.Type,
  pointer: Pointer.MemoryPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  if (Format.Types.isReferenceType(dataType)) {
    return yield* decodeMemoryReferenceByAddress(
      dataType,
      pointer,
      info,
      options
    );
  } else {
    return yield* Basic.Decode.decodeBasic(dataType, pointer, info, options);
  }
}

export function* decodeMemoryReferenceByAddress(
  dataType: Format.Types.ReferenceType,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  const { state } = info;
  let memoryVisited = (options.memoryVisited || []).slice(); //we'll be modifying this, so let's clone first
  debug("pointer %o", pointer);
  //note: for mappings, the following operations are pretty
  //meaningless, but I'm leaving them in anyway rather than
  //making mappings a totally separate case because it works
  //anyway and I may as well keep things parallel
  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, state);
  } catch (error) {
    return <Format.Errors.ErrorResult>{
      //dunno why TS is failing here
      type: dataType,
      kind: "error" as const,
      error: (<DecodingError>error).error
    };
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
        return <Format.Errors.ErrorResult>{
          //dunno why TS is failing here
          type: dataType,
          kind: "error" as const,
          error: (<DecodingError>error).error
        };
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

    case "array":
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
          return {
            type: dataType,
            kind: "error" as const,
            error: (<DecodingError>error).error
          };
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

      memoryVisited.unshift(objectPosition);

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
            { memoryVisited } //note this has been modified
          )
        );
      }

      return {
        type: dataType,
        kind: "value" as const,
        value: decodedChildren
      };

    case "struct":
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
        allocations: { memory: allocations },
        userDefinedTypes
      } = info;

      const typeId = dataType.id;
      const structAllocation = allocations[parseInt(typeId)];
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

      memoryVisited.unshift(objectPosition);
      let decodedMembers: Format.Values.NameValuePair[] = [];
      for (let index = 0; index < structAllocation.members.length; index++) {
        const memberAllocation = structAllocation.members[index];
        const memberPointer = memberAllocation.pointer;
        const childPointer: Pointer.MemoryPointer = {
          location: "memory" as const,
          start: startPosition + memberPointer.start,
          length: memberPointer.length //always equals WORD_SIZE or 0
        };

        let memberName = memberAllocation.definition.name;
        let storedType = <Format.Types.StructType>userDefinedTypes[typeId];
        if (!storedType) {
          return <Format.Errors.ErrorResult>{
            //dunno why TS is failing here
            type: dataType,
            kind: "error" as const,
            error: {
              kind: "UserDefinedTypeNotFoundError",
              type: dataType
            }
          };
        }
        let storedMemberType = storedType.memberTypes[index].type;
        let memberType = Format.Types.specifyLocation(
          storedMemberType,
          "memory"
        );

        decodedMembers.push({
          name: memberName,
          value: yield* decodeMemory(memberType, childPointer, info, {
            memoryVisited
          })
          //note that memoryVisited has been modified
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
