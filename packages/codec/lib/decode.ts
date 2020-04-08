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
  return Format.Utils.Circularity.tie(
    yield* decodeDispatch(dataType, pointer, info, options)
  );
}

function* decodeDispatch(
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
    case "returndata":
      return yield* AbiData.Decode.decodeAbi(dataType, pointer, info, options);

    case "eventtopic":
      return yield* Topic.Decode.decodeTopic(dataType, pointer, info, options);

    case "code":
    case "nowhere":
      //currently only basic types can go in code, so we'll dispatch directly to decodeBasic
      //(if it's a nowhere pointer, this will return an error result, of course)
      //also: we force zero-padding!
      return yield* Basic.Decode.decodeBasic(dataType, pointer, info, {
        paddingMode: "zero"
      });

    case "memory":
      //this case -- decoding something that resides *directly* in memory,
      //rather than located via a pointer -- only comes up when decoding immutables
      //in a constructor.  thus, we turn on the forceRightPadding option.
      return yield* Memory.Decode.decodeMemory(dataType, pointer, info, {
        paddingMode: "right"
      });
  }
}
