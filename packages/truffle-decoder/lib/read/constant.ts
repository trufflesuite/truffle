import debugModule from "debug";
const debug = debugModule("decoder:read:constant");

import * as DecodeUtils from "truffle-decode-utils";
import BN from "bn.js";

export function readDefinition(definition: DecodeUtils.AstDefinition): Uint8Array {

  debug("definition %o", definition);

  switch(DecodeUtils.Definition.typeClass(definition))
  {
    case "rational":
      let numericalValue: BN = DecodeUtils.Definition.rationalValue(definition);
      return DecodeUtils.Conversion.toBytes(numericalValue, DecodeUtils.EVM.WORD_SIZE);
      //you may be wondering, why do we not just use definition.value here,
      //like we do below? answer: because if this isn't a literal, that may not
      //exist
    case "stringliteral":
      return DecodeUtils.Conversion.toBytes(definition.hexValue);
    default:
      //unfortunately, other types of constants are just too complicated to
      //handle right now.  sorry.
      debug("unsupported constant definition type");
      return undefined;
  }
}
