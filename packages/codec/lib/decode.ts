import debugModule from "debug";
const debug = debugModule("codec:decode");

import * as AstConstant from "@truffle/codec/ast-constant";
import * as AbiData from "@truffle/codec/abi-data";
import * as Format from "@truffle/codec/format";
import * as Pointer from "@truffle/codec/pointer";
import * as Basic from "@truffle/codec/basic";
import * as Bytes from "@truffle/codec/bytes";
import * as Evm from "@truffle/codec/evm";
import { DecoderRequest, DecoderOptions } from "@truffle/codec/types";
import * as Memory from "@truffle/codec/memory";
import * as Special from "@truffle/codec/special";
import * as Stack from "@truffle/codec/stack";
import * as Storage from "@truffle/codec/storage";
import * as Topic from "@truffle/codec/topic";

export default function* decode(
  dataType: Format.Types.Type,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  debug("type %O", dataType);
  debug("pointer %O", pointer);

  switch (pointer.location) {
    case "storage":
      return yield* Storage.Decode.decodeStorage(dataType, pointer, info);

    case "stack":
      return yield* Stack.Decode.decodeStack(dataType, pointer, info);

    case "stackliteral":
      return yield* Stack.Decode.decodeLiteral(dataType, pointer, info);

    case "definition":
      return yield* AstConstant.Decode.decodeConstant(dataType, pointer, info);

    case "special":
      return yield* Special.Decode.decodeSpecial(dataType, pointer, info);

    case "calldata":
    case "eventdata":
      return yield* AbiData.Decode.decodeAbi(dataType, pointer, info, options);

    case "eventtopic":
      return yield* Topic.Decode.decodeTopic(dataType, pointer, info, options);

    case "memory":
      //NOTE: this case should never actually occur, but I'm including it
      //anyway as a fallback
      return yield* Memory.Decode.decodeMemory(dataType, pointer, info);
  }
}
