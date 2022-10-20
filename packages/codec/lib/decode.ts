import debugModule from "debug";
const debug = debugModule("codec:decode");

import * as AstConstant from "./ast-constant";
import * as AbiData from "./abi-data";
import * as Compiler from "./compiler";
import * as Format from "./format";
import type * as Pointer from "./pointer";
import * as Basic from "./basic";
import type * as Evm from "./evm";
import type { DecoderRequest, DecoderOptions } from "./types";
import * as Memory from "./memory";
import * as Special from "./special";
import * as Stack from "./stack";
import * as Storage from "./storage";
import * as Topic from "./topic";

export default function* decode(
  dataType: Format.Types.Type,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array | null> {
  return Format.Utils.Circularity.tie(
    yield* decodeDispatch(dataType, pointer, info, options)
  );
}

function* decodeDispatch(
  dataType: Format.Types.Type,
  pointer: Pointer.DataPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array | null> {
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
      //(also, Solidity <0.8.9 would always zero-pad immutables regardless of type,
      //so we have to set the padding mode appropriately to allow for this)
      return yield* Basic.Decode.decodeBasic(dataType, pointer, info, {
        ...options,
        paddingMode: "defaultOrZero"
      });

    case "memory":
      //this case -- decoding something that resides *directly* in memory,
      //rather than located via a pointer -- only comes up when decoding immutables
      //in a constructor.  thus, we turn on the forceRightPadding option on Solidity
      //versions prior to 0.8.9, because before then all immutables would be right-padded
      //while in memory
      switch (Compiler.Utils.solidityFamily(info.currentContext.compiler)) {
        case "0.5.x":
        case "0.8.x":
        case "0.8.7+":
          return yield* Memory.Decode.decodeMemory(dataType, pointer, info, {
            ...options,
            paddingMode: "right"
          });
        default:
          return yield* Memory.Decode.decodeMemory(
            dataType,
            pointer,
            info,
            options
          );
      }
  }
}
