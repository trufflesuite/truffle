import debugModule from "debug";
const debug = debugModule("codec:decode:event");

import decodeValue from "./value";
import read from "../read";
import { Types, Values, Conversion as ConversionUtils } from "truffle-codec-utils";
import { EventTopicPointer } from "../types/pointer";
import { EvmInfo, DecoderOptions } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";
import { StopDecodingError } from "../types/errors";

export default function* decodeTopic(dataType: Types.Type, pointer: EventTopicPointer, info: EvmInfo, options: DecoderOptions = {}): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  if(Types.isReferenceType(dataType)) {
    //we cannot decode reference types "stored" in topics; we have to just return an error
    let bytes: Uint8Array = yield* read(pointer, info.state);
    let raw: string = ConversionUtils.toHexString(bytes);
    //NOTE: even in strict mode we want to just return this, not throw an error here
    return {
      type: dataType,
      kind: "error",
      error: {
	kind: "IndexedReferenceTypeError",
        type: dataType,
        raw
      }
    };
  }
  //otherwise, dispatch to decodeValue
  return yield* decodeValue(dataType, pointer, info, options);
}
