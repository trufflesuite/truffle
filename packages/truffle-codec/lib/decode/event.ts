import debugModule from "debug";
const debug = debugModule("decoder-core:decode:event");

import decodeValue from "./value";
import read from "../read";
import { Types, Values, Conversion as ConversionUtils } from "truffle-codec-utils";
import { EventTopicPointer } from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";

export default function* decode(dataType: Types.Type, pointer: EventTopicPointer, info: EvmInfo): IterableIterator<Values.Result | DecoderRequest | GeneratorJunk> {
  if(Types.isReferenceType(dataType)) {
    //we cannot decode reference types "stored" in topics; we have to just return an error
    let bytes: Uint8Array;
    try {
      bytes = yield* read(pointer, info.state);
    }
    catch(error) { //error: Values.DecodingError
      return Values.makeGenericErrorResult(dataType, error.error);
    }
    let raw: string = ConversionUtils.toHexString(bytes);
    return Values.makeGenericErrorResult(
      dataType,
      new Values.IndexedReferenceTypeError(
        dataType,
        raw
      )
    );
  }
  //otherwise, dispatch to decodeValue
  return yield* decodeValue(dataType, pointer, info);
}
