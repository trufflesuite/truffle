import debugModule from "debug";
const debug = debugModule("codec:decode:constant");

import * as Conversion from "@truffle/codec/conversion";
import * as Format from "@truffle/codec/format";
import read from "@truffle/codec/read";
import * as Pointer from "@truffle/codec/pointer";
import * as Evm from "@truffle/codec/evm";
import * as Elementary from "@truffle/codec/elementary";
import { DecoderRequest } from "@truffle/codec/types";
import { DecodingError } from "@truffle/codec/decode/errors";

export default function* decodeConstant(
  dataType: Format.Types.Type,
  pointer: Pointer.ConstantDefinitionPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  debug("pointer %o", pointer);

  //normally, we just dispatch to decodeElementary.
  //for statically-sized bytes, however, we need to make a special case.
  //you see, decodeElementary expects to find the bytes at the *beginning*
  //of the word, but readDefinition will put them at the *end* of the
  //word.  So we'll have to adjust things ourselves.

  if (dataType.typeClass === "bytes" && dataType.kind === "static") {
    let size = dataType.length;
    let word: Uint8Array;
    try {
      word = yield* read(pointer, info.state);
    } catch (error) {
      return {
        type: dataType,
        kind: "error" as const,
        error: (<DecodingError>error).error
      };
    }
    //not bothering to check padding; shouldn't be necessary
    let bytes = word.slice(Evm.Utils.WORD_SIZE - size);
    return {
      type: dataType,
      kind: "value" as const,
      value: {
        asHex: Conversion.toHexString(bytes)
      }
    }; //we'll skip including a raw value, as that would be meaningless
  }

  //otherwise, as mentioned, just dispatch to decodeElementary
  debug("not a static bytes");
  return yield* Elementary.Decode.decodeElementary(dataType, pointer, info);
}
