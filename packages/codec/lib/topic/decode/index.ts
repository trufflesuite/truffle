import debugModule from "debug";
const debug = debugModule("codec:topic:decode");

import read from "@truffle/codec/read";
import * as Basic from "@truffle/codec/basic";
import * as Format from "@truffle/codec/format";
import * as Conversion from "@truffle/codec/conversion";
import type * as Pointer from "@truffle/codec/pointer";
import type { DecoderRequest, DecoderOptions } from "@truffle/codec/types";
import type * as Evm from "@truffle/codec/evm";

export function* decodeTopic(
  dataType: Format.Types.Type,
  pointer: Pointer.EventTopicPointer,
  info: Evm.EvmInfo,
  options: DecoderOptions = {}
): Generator<DecoderRequest, Format.Values.Result, Uint8Array> {
  if (
    Format.Types.isReferenceType(dataType) ||
    dataType.typeClass === "tuple"
  ) {
    //we cannot decode reference types "stored" in topics; we have to just return an error
    let bytes: Uint8Array = yield* read(pointer, info.state);
    let raw: string = Conversion.toHexString(bytes);
    //NOTE: even in strict mode we want to just return this, not throw an error here
    return <Format.Errors.ErrorResult>{
      //dunno why TS is failing here
      type: dataType,
      kind: "error" as const,
      error: {
        kind: "IndexedReferenceTypeError" as const,
        type: dataType,
        raw
      }
    };
  }
  //otherwise, dispatch to decodeBasic
  return yield* Basic.Decode.decodeBasic(dataType, pointer, info, options);
}
