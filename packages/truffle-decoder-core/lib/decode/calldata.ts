import debugModule from "debug";
const debug = debugModule("decoder-core:decode:calldata");

import read from "../read";
import * as DecodeUtils from "truffle-decode-utils";
import { Types, Values, Errors } from "truffle-decode-utils";
import decodeValue from "./value";
import { CalldataPointer, DataPointer } from "../types/pointer";
import { CalldataMemberAllocation } from "../types/allocation";
import { calldataSizeForType, isTypeDynamic } from "../allocate/calldata";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decodeCalldata(dataType: Types.Type, pointer: CalldataPointer, info: EvmInfo, base: number = 0): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  if(Types.isReferenceType(dataType)) {
    let dynamic: boolean;
    try {
      dynamic = isTypeDynamic(dataType, info.calldataAllocations);
    }
    catch(error) { //error: Errors.DecodingError
      return Errors.makeGenericErrorResult(dataType, error.error);
    }
    if(dynamic) {
      return yield* decodeCalldataReferenceByAddress(dataType, pointer, info, base);
    }
    else {
      return yield* decodeCalldataReferenceStatic(dataType, pointer, info);
    }
  }
  else {
    debug("pointer %o", pointer);
    return yield* decodeValue(dataType, pointer, info);
  }
}

export function* decodeCalldataReferenceByAddress(dataType: Types.ReferenceType, pointer: DataPointer, info: EvmInfo, base: number = 0): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  const { state } = info;
  debug("pointer %o", pointer);
  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, state);
  }
  catch(error) { //error: Errors.DecodingError
    return Errors.makeGenericErrorResult(dataType, error.error);
  }

  let startPosition = DecodeUtils.Conversion.toBN(rawValue).toNumber() + base;
  debug("startPosition %d", startPosition);

  let dynamic: boolean;
  try {
    dynamic = isTypeDynamic(dataType, info.calldataAllocations);
  }
  catch(error) { //error: Errors.DecodingError
    return Errors.makeGenericErrorResult(dataType, error.error);
  }
  if(!dynamic) { //this will only come up when called from stack.ts
    let size: number;
    try {
      size = calldataSizeForType(dataType, info.calldataAllocations);
    }
    catch(error) { //error: Errors.DecodingError
      return Errors.makeGenericErrorResult(dataType, error.error);
    }
    let staticPointer = {
      calldata: {
        start: startPosition,
        length: size
      }
    }
    return yield* decodeCalldataReferenceStatic(dataType, staticPointer, info);
  }
  let length: number;
  let rawLength: Uint8Array;
  switch (dataType.typeClass) {

    case "bytes":
    case "string":
      //initial word contains length
      try {
        rawLength = <Uint8Array> (yield* read({
          calldata: {
            start: startPosition,
            length: DecodeUtils.EVM.WORD_SIZE
          }
        }, state));
      }
      catch(error) { //error: Errors.DecodingError
        return Errors.makeGenericErrorResult(dataType, error.error);
      }
      length = DecodeUtils.Conversion.toBN(rawLength).toNumber();

      let childPointer: CalldataPointer = {
        calldata: { start: startPosition + DecodeUtils.EVM.WORD_SIZE, length }
      }

      return yield* decodeValue(dataType, childPointer, info);

    case "array":

      switch(dataType.kind) {
        case "dynamic":
          //initial word contains array length
          try {
            rawLength = <Uint8Array> (yield* read({
              calldata: {
                start: startPosition,
                length: DecodeUtils.EVM.WORD_SIZE
              }
            }, state));
          }
          catch(error) { //error: Errors.DecodingError
            return Errors.makeGenericErrorResult(dataType, error.error);
          }
          length = DecodeUtils.Conversion.toBN(rawLength).toNumber();
          startPosition += DecodeUtils.EVM.WORD_SIZE; //increment startPosition
          //to next word, as first word was used for length
          break;
        case "static":
          length = dataType.length.toNumber();
          break;
      }

      //note: I've written this fairly generically, but it is worth noting that
      //since this array is of dynamic type, we know that if it's static length
      //then size must be EVM.WORD_SIZE

      let baseSize: number;
      try {
        baseSize = calldataSizeForType(dataType.baseType, info.calldataAllocations);
      }
      catch(error) { //error: Errors.DecodingError
        return Errors.makeGenericErrorResult(dataType, error.error);
      }

      let decodedChildren: Values.Result[] = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(
          <Values.Result> (yield* decodeCalldata(
            dataType.baseType,
            { calldata: {
              start: startPosition + index * baseSize,
              length: baseSize
            }},
            info, startPosition
          ))
        ); //pointer base is always start of list, never the length
      }
      return new Values.ArrayValue(dataType, decodedChildren);

    case "struct":
      return yield* decodeCalldataStructByPosition(dataType, startPosition, info);
  }
}

export function* decodeCalldataReferenceStatic(dataType: Types.ReferenceType, pointer: CalldataPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  debug("static");
  debug("pointer %o", pointer);

  switch (dataType.typeClass) {
    case "array":

      //we're in the static case, so we know the array must be statically sized
      const length = (<Types.ArrayTypeStatic>dataType).length.toNumber();
      let baseSize: number;
      try {
        baseSize = calldataSizeForType(dataType.baseType, info.calldataAllocations);
      }
      catch(error) { //error: Errors.DecodingError
        return Errors.makeGenericErrorResult(dataType, error.error);
      }

      let decodedChildren: Values.Result[] = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(
          <Values.Result> (yield* decodeCalldata(
            dataType.baseType,
            { calldata: {
              start: pointer.calldata.start + index * baseSize,
              length: baseSize
            }},
            info
          ))
        ); //static case so don't need base
      }
      return new Values.ArrayValue(dataType, decodedChildren);

    case "struct":
      return yield* decodeCalldataStructByPosition(dataType, pointer.calldata.start, info);
  }
}

//note that this function takes the start position as a *number*; it does not take a calldata pointer
function* decodeCalldataStructByPosition(dataType: Types.StructType, startPosition: number, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  const { userDefinedTypes, calldataAllocations } = info;

  const typeId = dataType.id;
  const structAllocation = calldataAllocations[typeId];
  if(!structAllocation) {
    return new Errors.StructErrorResult(
      dataType,
      new Errors.UserDefinedTypeNotFoundError(dataType)
    );
  }

  let decodedMembers: Values.NameValuePair[] = [];
  for(let index = 0; index < structAllocation.members.length; index++) {
    const memberAllocation = structAllocation.members[index];
    const memberPointer = memberAllocation.pointer;
    const childPointer: CalldataPointer = {
      calldata: {
        start: startPosition + memberPointer.calldata.start,
        length: memberPointer.calldata.length
      }
    };

    let memberName = memberAllocation.definition.name;
    let storedType = <Types.StructType>userDefinedTypes[typeId];
    if(!storedType) {
      return new Errors.StructErrorResult(
        dataType,
        new Errors.UserDefinedTypeNotFoundError(dataType)
      );
    }
    let storedMemberType = storedType.memberTypes[index].type;
    let memberType = Types.specifyLocation(storedMemberType, "calldata");

    decodedMembers.push({
      name: memberName,
      value: <Values.Result> (yield* decodeCalldata(memberType, childPointer, info, startPosition))
      //note that startPosition is only needed in the dynamic case, but we don't know which case we're in
    });
  }
  return new Values.StructValue(dataType, decodedMembers);
}
