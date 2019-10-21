import debugModule from "debug";
const debug = debugModule("codec:decode:constant");

import * as ConversionUtils from "lib/utils/conversion";
import * as EvmUtils from "lib/utils/evm";
import { Types, Values } from "lib/format";
import read from "lib/read";
import decodeValue from "./value";
import * as Pointer from "lib/pointer/types";
import * as Decoding from "./types";
import * as Evm from "lib/evm";
import { DecodingError } from "lib/decode/errors";

export default function* decodeConstant(
  dataType: Types.Type,
  pointer: Pointer.ConstantDefinitionPointer,
  info: Evm.Types.EvmInfo
): Generator<Decoding.DecoderRequest, Values.Result, Uint8Array> {
  debug("pointer %o", pointer);

  //normally, we just dispatch to decodeValue.
  //for statically-sized bytes, however, we need to make a special case.
  //you see, decodeValue expects to find the bytes at the *beginning*
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
    let bytes = word.slice(EvmUtils.WORD_SIZE - size);
    return {
      type: dataType,
      kind: "value" as const,
      value: {
        asHex: ConversionUtils.toHexString(bytes)
      }
    }; //we'll skip including a raw value, as that would be meaningless
  }

  //otherwise, as mentioned, just dispatch to decodeValue
  debug("not a static bytes");
  return yield* decodeValue(dataType, pointer, info);
}
