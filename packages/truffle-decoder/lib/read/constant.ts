import debugModule from "debug";
const debug = debugModule("decoder:read:constant");

import * as DecodeUtils from "truffle-decode-utils";
import { ConstantDefinitionPointer } from "../types/pointer";
import BN from "bn.js";

export function read(pointer: ConstantDefinitionPointer): Uint8Array {

  debug("pointer %o", pointer);

  switch(DecodeUtils.Definition.typeClass(pointer.definition))
  {
    case "rational":
      let numericalValue: BN = DecodeUtils.Definition.rationalValue(pointer.definition);
      return DecodeUtils.Conversion.toBytes(numericalValue, DecodeUtils.EVM.WORD_SIZE);
    case "stringliteral":
      return DecodeUtils.Conversion.toBytes(pointer.definition.hexValue);
    default:
      debug("unrecognized constant definition type");
      return undefined;
  }
}
