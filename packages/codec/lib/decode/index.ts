import debugModule from "debug";
const debug = debugModule("codec:decode");

import decodeValue from "./value";
import decodeMemory from "./memory";
import decodeStorage from "./storage";
import decodeStack from "./stack";
import { decodeLiteral } from "./stack";
import decodeAbi from "./abi";
import decodeConstant from "./constant";
import decodeSpecial from "./special";
import decodeTopic from "./event";
import { Types, Values } from "truffle-codec-utils";
import * as Pointer from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderOptions } from "../types/options";
import { DecoderRequest } from "../types/request";

export default function* decode(dataType: Types.Type, pointer: Pointer.DataPointer, info: EvmInfo, options: DecoderOptions = {}): Generator<DecoderRequest, Values.Result, Uint8Array> {
  debug("type %O", dataType);
  debug("pointer %O", pointer);

  switch(pointer.location) {

    case "storage":
      return yield* decodeStorage(dataType, pointer, info)

    case "stack":
      return yield* decodeStack(dataType, pointer, info);

    case "stackliteral":
      return yield* decodeLiteral(dataType, pointer, info);

    case "definition":
      return yield* decodeConstant(dataType, pointer, info);

    case "special":
      return yield* decodeSpecial(dataType, pointer, info);

    case "calldata":
    case "eventdata":
      return yield* decodeAbi(dataType, pointer, info, options);

    case "eventtopic":
      return yield* decodeTopic(dataType, pointer, info, options);

    case "memory":
      //NOTE: this case should never actually occur, but I'm including it
      //anyway as a fallback
      return yield* decodeMemory(dataType, pointer, info);
  }
}
