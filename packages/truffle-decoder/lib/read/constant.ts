import debugModule from "debug";
const debug = debugModule("decoder:read:constant");

import * as DecodeUtils from "truffle-decode-utils";
import { ConstantDefinitionPointer } from "../types/pointer";
import BN from "bn.js";

export function readDefinition(pointer: ConstantDefinitionPointer): Uint8Array {

  debug("pointer %o", pointer);

  switch(DecodeUtils.Definition.typeClass(pointer.definition))
  {
    case "rational":
      let numericalValue: BN = DecodeUtils.Definition.rationalValue(pointer.definition);
      return DecodeUtils.Conversion.toBytes(numericalValue, DecodeUtils.EVM.WORD_SIZE);
      //you may be wondering, why do we not just use pointer.definition.value here, like
      //we do below? answer: because if this isn't a literal, that may not exist
    case "stringliteral":
      return DecodeUtils.Conversion.toBytes(pointer.definition.hexValue);
    default:
      //unfortunately, other types of constants are just too complicated to
      //handle right now.  sorry.
      debug("unsupported constant definition type");
      return undefined;
  }
}
