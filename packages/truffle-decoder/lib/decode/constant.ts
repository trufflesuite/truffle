import debugModule from "debug";
const debug = debugModule("decoder:decode:constant");

import * as DecodeUtils from "truffle-decode-utils";
import read from "../read";
import decodeValue from "./value";
import { ConstantDefinitionPointer} from "../types/pointer";
import { EvmInfo } from "../types/evm";
import { DecoderRequest } from "../types/request";
import BN from "bn.js";

export default function* decodeConstant(definition: DecodeUtils.AstDefinition, pointer: ConstantDefinitionPointer, info: EvmInfo): IterableIterator<any | DecoderRequest> {

  debug("definition %O", definition);
  debug("pointer %o", pointer);

  //normally, we just dispatch to decodeValue.
  //for statically-sized bytes, however, we need to make a special case.
  //you see, decodeValue expects to find the bytes at the *beginning*
  //of the word, but readDefinition will put them at the *end* of the
  //word.  So we'll have to adjust things ourselves.

  if(DecodeUtils.Definition.typeClass(definition) === "bytes") {
    let size = DecodeUtils.Definition.specifiedSize(definition);
    if(size !== null) {
      let word = yield* read(pointer, info.state);
      let bytes = word.slice(DecodeUtils.EVM.WORD_SIZE - size);
      return DecodeUtils.Conversion.toHexString(bytes);
    }
  }

  //otherwise, as mentioned, just dispatch to decodeValue
  return yield* decodeValue(definition, pointer, info);
}
