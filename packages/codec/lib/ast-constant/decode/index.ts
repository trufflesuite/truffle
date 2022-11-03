/**
 * @protected
 *
 * @packageDocumentation
 */
import debugModule from "debug";
const debug = debugModule("codec:ast:decode");

import read from "@truffle/codec/read";
import * as Conversion from "@truffle/codec/conversion";
import type * as Format from "@truffle/codec/format";
import type * as Pointer from "@truffle/codec/pointer";
import * as Basic from "@truffle/codec/basic";
import * as Bytes from "@truffle/codec/bytes";
import type { DecoderRequest } from "@truffle/codec/types";
import * as Evm from "@truffle/codec/evm";
import { handleDecodingError } from "@truffle/codec/errors";

export function* decodeConstant(
  dataType: Format.Types.Type,
  pointer: Pointer.ConstantDefinitionPointer,
  info: Evm.EvmInfo
): Generator<DecoderRequest, Format.Values.Result, Uint8Array | null> {
  debug("pointer %o", pointer);

  //normally, we just dispatch to decodeBasic or decodeBytes.
  //for statically-sized bytes, however, we need to make a special case.
  //you see, decodeBasic expects to find the bytes at the *beginning*
  //of the word, but readDefinition will put them at the *end* of the
  //word.  So we'll have to adjust things ourselves.
  //(if the constant is a string constant, it'll be *just* the bytes, so
  //we have to pad it...)

  if (dataType.typeClass === "bytes" && dataType.kind === "static") {
    const size = dataType.length;
    let word: Uint8Array;
    try {
      word = yield* read(pointer, info.state);
    } catch (error) {
      return handleDecodingError(dataType, error);
    }
    debug("got word: %O", word);
    //not bothering to check padding; shouldn't be necessary
    const bytes = word.slice(-size); //isolate the bytes we want (works in both cases, even if string literal is short)
    return {
      type: dataType,
      kind: "value" as const,
      value: {
        asHex: Conversion.toHexString(bytes, size, true) //padding in case of short string literal
      },
      interpretations: {}
    }; //we'll skip including a raw value, as that would be meaningless
  }

  //otherwise, as mentioned, just dispatch to decodeBasic or decodeBytes
  debug("not a static bytes");
  if (dataType.typeClass === "bytes" || dataType.typeClass === "string") {
    return yield* Bytes.Decode.decodeBytes(dataType, pointer, info);
  }
  return yield* Basic.Decode.decodeBasic(dataType, pointer, info);
}
