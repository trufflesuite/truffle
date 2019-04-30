import debugModule from "debug";
const debug = debugModule("decoder:decode");

import decodeValue from "./value";
import decodeMemory from "./memory";
import decodeStorage from "./storage";
import decodeStack from "./stack";
import { decodeLiteral } from "./stack";
import decodeCalldata from "./calldata";
import decodeConstant from "./constant";
import decodeSpecial from "./special";
import { AstDefinition } from "truffle-decode-utils";
import * as Pointer from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest } from "../types/request";

export default function* decode(definition: AstDefinition, pointer: Pointer.DataPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {
  debug("Decoding %s", definition.name);
  debug("pointer %O", pointer);

  if(Pointer.isStoragePointer(pointer)) {
    return yield* decodeStorage(definition, pointer, info)
  }

  if(Pointer.isStackPointer(pointer)) {
    return yield* decodeStack(definition, pointer, info);
  }

  if (Pointer.isStackLiteralPointer(pointer)) {
    return yield* decodeLiteral(definition, pointer, info);
  }

  if(Pointer.isConstantDefinitionPointer(pointer)) {
    return yield* decodeConstant(definition, pointer, info);
    //I'd like to just use decodeValue, but unfortunately there are some special
    //cases to deal with
  }

  if(Pointer.isSpecialPointer(pointer)) {
    return yield* decodeSpecial(definition, pointer, info);
  }

  //NOTE: the following two cases shouldn't come up but they've been left in as
  //fallback cases

  if(Pointer.isMemoryPointer(pointer)) {
    return yield* decodeMemory(definition, pointer, info);
  }

  if(Pointer.isCalldataPointer(pointer)) {
    return yield* decodeCalldata(definition, pointer, info);
  }
}
