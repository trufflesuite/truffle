import debugModule from "debug";
const debug = debugModule("decoder-core:decode");

import decodeValue from "./value";
import decodeMemory from "./memory";
import decodeStorage from "./storage";
import decodeStack from "./stack";
import { decodeLiteral } from "./stack";
import decodeCalldata from "./calldata";
import decodeConstant from "./constant";
import decodeSpecial from "./special";
import { AstDefinition, Types, Values } from "truffle-decode-utils";
import * as Pointer from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decode(definition: AstDefinition, pointer: Pointer.DataPointer, info: EvmInfo): IterableIterator<Values.Value | DecoderRequest | GeneratorJunk> {
  let dataType = Types.definitionToType(definition);
  debug("definition %O", definition);
  return yield* decodePointer(dataType, pointer, info);
}

export function* decodePointer(dataType: Types.Type, pointer: Pointer.DataPointer, info: EvmInfo): IterableIterator<Values.Value | DecoderRequest | GeneratorJunk> {
  debug("type %O", dataType);
  debug("pointer %O", pointer);

  if(Pointer.isStoragePointer(pointer)) {
    return yield* decodeStorage(dataType, pointer, info)
  }

  if(Pointer.isStackPointer(pointer)) {
    return yield* decodeStack(dataType, pointer, info);
  }

  if (Pointer.isStackLiteralPointer(pointer)) {
    return yield* decodeLiteral(dataType, pointer, info);
  }

  if(Pointer.isConstantDefinitionPointer(pointer)) {
    return yield* decodeConstant(dataType, pointer, info);
    //I'd like to just use decodeValue, but unfortunately there are some special
    //cases to deal with
  }

  if(Pointer.isSpecialPointer(pointer)) {
    return yield* decodeSpecial(dataType, pointer, info);
  }

  //NOTE: the following two cases shouldn't come up but they've been left in as
  //fallback cases

  if(Pointer.isMemoryPointer(pointer)) {
    return yield* decodeMemory(dataType, pointer, info);
  }

  if(Pointer.isCalldataPointer(pointer)) {
    return yield* decodeCalldata(dataType, pointer, info);
  }
}
