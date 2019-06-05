import debugModule from "debug";
const debug = debugModule("decoder-core:decode:event");

import decodeValue from "./value";
import { Types, Values, Conversion as ConversionUtils } from "truffle-decode-utils";
import { EventTopicPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decode(dataType: Types.Type, pointer: EventTopicPointer, info: EvmInfo): IterableIterator<Values.Value | DecoderRequest | GeneratorJunk> {
  if(Types.isReferenceType(dataType)) {
    //we cannot decode reference types "stored" in topics; we have to just return an error
    let bytes: Uint8Array;
    try {
      bytes = yield* read(pointer, state);
    }
    catch(error) { //error: Values.DecodingError
      return new Values.ValueErrorGeneric(error.error);
    }
    let raw: string = ConversionUtils.toHexString(bytes);
    return new Values.ValueErrorGeneric(
      new Values.IndexedReferenceTypeError(
        dataType,
        raw
      )
    )
  }
  //otherwise, dispatch to decodeValue
  return yield* decodeValue(dataType, pointer, info);
}
