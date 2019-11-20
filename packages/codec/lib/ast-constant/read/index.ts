import debugModule from "debug";
const debug = debugModule("codec:ast:read");

import * as Conversion from "@truffle/codec/conversion";
import * as Evm from "@truffle/codec/evm";
import * as Ast from "@truffle/codec/ast";
import * as Pointer from "@truffle/codec/pointer";
import BN from "bn.js";
import { DecodingError } from "@truffle/codec/errors";

export function readDefinition(
  pointer: Pointer.ConstantDefinitionPointer
): Uint8Array {
  const definition = pointer.definition;
  debug("definition %o", definition);

  switch (Ast.Utils.typeClass(definition)) {
    case "rational":
      let numericalValue: BN = Ast.Utils.rationalValue(definition);
      return Conversion.toBytes(numericalValue, Evm.Utils.WORD_SIZE);
    //you may be wondering, why do we not just use definition.value here,
    //like we do below? answer: because if this isn't a literal, that may not
    //exist
    case "stringliteral":
      return Conversion.toBytes(definition.hexValue);
    default:
      //unfortunately, other types of constants are just too complicated to
      //handle right now.  sorry.
      debug("unsupported constant definition type");
      throw new DecodingError({
        kind: "UnsupportedConstantError",
        definition
      });
  }
}
