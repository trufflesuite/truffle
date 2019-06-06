import debugModule from "debug";
const debug = debugModule("decoder-core:decode:constant");

import * as DecodeUtils from "truffle-decode-utils";
import { Types, Values } from "truffle-decode-utils";
import read from "../read";
import decodeValue from "./value";
import { ConstantDefinitionPointer} from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest, GeneratorJunk } from "../types/request";
import BN from "bn.js";

export default function* decodeConstant(dataType: Types.Type, pointer: ConstantDefinitionPointer, info: EvmInfo): IterableIterator<Values.Value | DecoderRequest | GeneratorJunk> {

  debug("pointer %o", pointer);

  //normally, we just dispatch to decodeValue.
  //for statically-sized bytes, however, we need to make a special case.
  //you see, decodeValue expects to find the bytes at the *beginning*
  //of the word, but readDefinition will put them at the *end* of the
  //word.  So we'll have to adjust things ourselves.

  if(dataType.typeClass === "bytes" && dataType.kind === "static") {
    let size = dataType.length;
    let word: Uint8Array;
    try {
      word = yield* read(pointer, info.state);
    }
    catch(error) { //error: Values.DecodingError
      return Values.makeGenericValueError(dataType, error.error);
    }
    //not bothering to check padding; shouldn't be necessary
    let bytes = word.slice(DecodeUtils.EVM.WORD_SIZE - size);
    return new Values.BytesValueProper(
      dataType,
      DecodeUtils.Conversion.toHexString(bytes)
    );
  }

  //otherwise, as mentioned, just dispatch to decodeValue
  return yield* decodeValue(dataType, pointer, info);
}
