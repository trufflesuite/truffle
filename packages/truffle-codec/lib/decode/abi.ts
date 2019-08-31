import debugModule from "debug";
const debug = debugModule("codec:decode:abi");

import read from "../read";
import * as CodecUtils from "truffle-codec-utils";
import { Types, Values } from "truffle-codec-utils";
import decodeValue from "./value";
import { AbiDataPointer, DataPointer } from "../types/pointer";
import { AbiMemberAllocation } from "../types/allocation";
import { abiSizeInfo } from "../allocate/abi";
import { EvmInfo } from "../types/evm";
import { DecoderOptions } from "../types/options";
import { DecoderRequest, GeneratorJunk } from "../types/request";
import { StopDecodingError } from "../types/errors";

type AbiLocation = "calldata" | "eventdata"; //leaving out "abi" as it shouldn't occur here

export default function* decodeAbi(dataType: Types.Type, pointer: AbiDataPointer, info: EvmInfo, options: DecoderOptions = {}): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  if(Types.isReferenceType(dataType)) {
    let dynamic: boolean;
    try {
      dynamic = abiSizeInfo(dataType, info.allocations.abi).dynamic;
    }
    catch(error) { //error: Errors.DecodingError
      if(options.strictAbiMode) {
        throw new StopDecodingError(error.error);
      }
      return {
        type: dataType,
        kind: "error",
        error: error.error
      };
    }
    if(dynamic) {
      return yield* decodeAbiReferenceByAddress(dataType, pointer, info, options);
    }
    else {
      return yield* decodeAbiReferenceStatic(dataType, pointer, info, options);
    }
  }
  else {
    debug("pointer %o", pointer);
    return yield* decodeValue(dataType, pointer, info, options);
  }
}

export function* decodeAbiReferenceByAddress(dataType: Types.ReferenceType, pointer: DataPointer, info: EvmInfo, options: DecoderOptions = {}): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  let { strictAbiMode: strict, abiPointerBase: base } = options;
  base = base || 0; //in case base was undefined
  const { allocations: { abi: allocations }, state } = info;
  debug("pointer %o", pointer);
  //this variable holds the location we should look to *next*
  const location: AbiLocation = pointer.location === "eventdata"
    ? "eventdata"
    : "calldata"; //stack pointers (& stack literal pointers) point to calldata, not the stack

  let rawValue: Uint8Array;
  try {
    rawValue = yield* read(pointer, state);
  }
  catch(error) { //error: Errors.DecodingError
    if(strict) {
      throw new StopDecodingError(error.error);
    }
    return {
      type: dataType,
      kind: "error",
      error: error.error
    };
  }

  let rawValueAsBN = CodecUtils.Conversion.toBN(rawValue);
  if(strict && rawValueAsBN.gtn(state[location].length)) {
    //why is this check here??
    //it's really just to protect us against the toNumber()
    //conversion :)
    throw new StopDecodingError(
      { 
        kind: "PointerTooLargeError",
        pointerAsBN: rawValueAsBN,
        dataLength: state[location].length
      }
    );
  }
  let startPosition = rawValueAsBN.toNumber() + base;
  debug("startPosition %d", startPosition);

  let dynamic: boolean;
  let size: number;
  try {
    ({dynamic, size}) = abiSizeInfo(dataType, allocations);
  }
  catch(error) { //error: Errors.DecodingError
    if(strict) {
      throw new StopDecodingError(error.error);
    }
    return {
      type: dataType,
      kind: "error",
      error: error.error
    };
  }
  if(!dynamic) { //this will only come up when called from stack.ts
    let staticPointer = {
      location,
      start: startPosition,
      length: size
    }
    return yield* decodeAbiReferenceStatic(dataType, staticPointer, info, options);
  }
  let length: number;
  let rawLength: Uint8Array;
  switch (dataType.typeClass) {

    case "bytes":
    case "string":
      //initial word contains length
      try {
        rawLength = <Uint8Array> (yield* read({
          location,
          start: startPosition,
          length: CodecUtils.EVM.WORD_SIZE
        }, state));
      }
      catch(error) { //error: Errors.DecodingError
        if(strict) {
          throw new StopDecodingError(error.error);
        }
        return {
          type: dataType,
          kind: "error",
          error: error.error
        };
      }
      let lengthAsBN = CodecUtils.Conversion.toBN(rawLength);
      if(strict && lengthAsBN.gtn(state[location].length)) {
        //you may notice that the comparison is a bit crude; that's OK, this is
        //just to prevent huge numbers from DOSing us, other errors will still
        //be caught regardless
        throw new StopDecodingError(
          { 
            kind: "OverlongArrayOrStringError",
            lengthAsBN,
            dataLength: state[location].length
          }
        );
      }
      length = lengthAsBN.toNumber();

      let childPointer: AbiDataPointer = {
        location,
        start: startPosition + CodecUtils.EVM.WORD_SIZE,
        length
      }

      return yield* decodeValue(dataType, childPointer, info, options);

    case "array":

      switch(dataType.kind) {
        case "dynamic":
          //initial word contains array length
          try {
            rawLength = <Uint8Array> (yield* read({
              location,
              start: startPosition,
              length: CodecUtils.EVM.WORD_SIZE
            }, state));
          }
          catch(error) { //error: Errors.DecodingError
            if(strict) {
              throw new StopDecodingError(error.error);
            }
            return {
              type: dataType,
              kind: "error",
              error: error.error
            };
          }
          let lengthAsBN = CodecUtils.Conversion.toBN(rawLength);
          if(strict && lengthAsBN.gtn(state[location].length)) {
            //you may notice that the comparison is a bit crude; that's OK, this is
            //just to prevent huge numbers from DOSing us, other errors will still
            //be caught regardless
            throw new StopDecodingError(
              { 
                kind: "OverlongArrayOrStringError",
                lengthAsBN,
                dataLength: state[location].length
              }
            );
          }
          length = lengthAsBN.toNumber();
          startPosition += CodecUtils.EVM.WORD_SIZE; //increment startPosition
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
        baseSize = abiSizeInfo(dataType.baseType, allocations).size;
      }
      catch(error) { //error: Errors.DecodingError
        if(strict) {
          throw new StopDecodingError(error.error);
        }
        return {
          type: dataType,
          kind: "error",
          error: error.error
        };
      }

      let decodedChildren: Values.Result[] = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(
          <Values.Result> (yield* decodeAbi(
            dataType.baseType,
            {
              location,
              start: startPosition + index * baseSize,
              length: baseSize
            },
            info, { ...options, abiPointerBase: startPosition }
          ))
        ); //pointer base is always start of list, never the length
      }
      return { 
        type: dataType,
        kind: "value",
        value: decodedChildren
      };

    case "struct":
      return yield* decodeAbiStructByPosition(dataType, location, startPosition, info, options);
    case "tuple":
      return yield* decodeAbiTupleByPosition(dataType, location, startPosition, info, options);
  }
}

export function* decodeAbiReferenceStatic(dataType: Types.ReferenceType, pointer: AbiDataPointer, info: EvmInfo, options: DecoderOptions = {}): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  debug("static");
  debug("pointer %o", pointer);
  const location = pointer.location;

  switch (dataType.typeClass) {
    case "array":

      //we're in the static case, so we know the array must be statically sized
      const length = (<Types.ArrayTypeStatic>dataType).length.toNumber();
      let baseSize: number;
      try {
        baseSize = abiSizeInfo(dataType.baseType, info.allocations.abi).size;
      }
      catch(error) { //error: Errors.DecodingError
        if(options.strictAbiMode) {
          throw new StopDecodingError(error.error);
        }
        return {
          type: dataType,
          kind: "error",
          error: error.error
        };
      }

      let decodedChildren: Values.Result[] = [];
      for(let index = 0; index < length; index++) {
        decodedChildren.push(
          <Values.Result> (yield* decodeAbi(
            dataType.baseType,
            {
              location,
              start: pointer.start + index * baseSize,
              length: baseSize
            },
            info, options
          ))
        );
      }
      return { 
        type: dataType,
        kind: "value",
        value: decodedChildren
      };

    case "struct":
      return yield* decodeAbiStructByPosition(dataType, location, pointer.start, info, options);
    case "tuple":
      return yield* decodeAbiTupleByPosition(dataType, location, startPosition, info, options);
  }
}

//note that this function takes the start position as a *number*; it does not take a pointer
function* decodeAbiStructByPosition(dataType: Types.StructType, location: AbiLocation, startPosition: number, info: EvmInfo, options: DecoderOptions = {}): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  const { userDefinedTypes, allocations: { abi: allocations } } = info;

  const typeLocation = location === "eventdata"
    ? null //eventdata is not a valid location for a type
    : location;

  const typeId = dataType.id;
  const structAllocation = allocations[parseInt(typeId)];
  if(!structAllocation) {
    let error = {
      kind: "UserDefinedTypeNotFoundError" as "UserDefinedTypeNotFoundError",
      type: dataType
    };
    if(options.strictAbiMode) {
      throw new StopDecodingError(error);
    }
    return {
      type: dataType,
      kind: "error",
      error
    };
  }

  let decodedMembers: Values.NameValuePair[] = [];
  for(let index = 0; index < structAllocation.members.length; index++) {
    const memberAllocation = structAllocation.members[index];
    const memberPointer = memberAllocation.pointer;
    const childPointer: AbiDataPointer = {
      location,
      start: startPosition + memberPointer.start,
      length: memberPointer.length
    };

    let memberName = memberAllocation.name;
    let storedType = <Types.StructType>userDefinedTypes[typeId];
    if(!storedType) {
      let error = {
        kind: "UserDefinedTypeNotFoundError" as "UserDefinedTypeNotFoundError",
        type: dataType
      };
      if(options.strictAbiMode) {
        throw new StopDecodingError(error);
      }
      return {
        type: dataType,
        kind: "error",
        error
      };
    }
    let storedMemberType = storedType.memberTypes[index].type;
    let memberType = Types.specifyLocation(storedMemberType, typeLocation);

    decodedMembers.push({
      name: memberName,
      value: <Values.Result> (yield* decodeAbi(memberType, childPointer, info, {...options, abiPointerBase: startPosition}))
      //note that the base option is only needed in the dynamic case, but we're being indiscriminate
    });
  }
  return { 
    type: dataType,
    kind: "value",
    value: decodedMembers
  };
}

//note that this function takes the start position as a *number*; it does not take a pointer
function* decodeAbiTupleByPosition(dataType: Types.TupleType, location: AbiLocation, startPosition: number, info: EvmInfo, options: DecoderOptions = {}): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  //WARNING: This case is written in a way that involves a bunch of unnecessary recomputation!
  //I'm writing it this way anyway for simplicity, to avoid rewriting the decoder
  //However it may be worth revisiting this in the future if performance turns out to be a problem
  //(changing this may be pretty hard though)

  let decodedMembers: Values.NameValuePair[] = [];
  let position = startPosition;
  for(const { name, type: memberType } of dataTypes.memberTypes) {
    const memberSize = abiSizeInfo(dataType.baseType, allocations).size;
    const childPointer: AbiDataPointer = {
      location,
      start: position,
      length: memberSize
    };
    decodedMembers.push({
      name,
      value: <Values.Result> (yield* decodeAbi(memberType, childPointer, info, {...options, abiPointerBase: startPosition}))
      //note that the base option is only needed in the dynamic case, but we're being indiscriminate
    });
    position += memberSize;
  }
  return { 
    type: dataType,
    kind: "value",
    value: decodedMembers
  };
}
