import debugModule from "debug";
const debug = debugModule("codec:mapping-key:encode");

import * as Format from "@truffle/codec/format";
import * as Conversion from "@truffle/codec/conversion";
import * as Evm from "@truffle/codec/evm";
import * as BasicEncode from "@truffle/codec/basic/encode";
import * as BytesEncode from "@truffle/codec/bytes/encode";

//UGH -- it turns out TypeScript can't handle nested tagged unions
//see: https://github.com/microsoft/TypeScript/issues/18758
//so, I'm just going to have to throw in a bunch of type coercions >_>

/**
 * @Category Encoding (low-level)
 */
export function encodeMappingKey(
  input: Format.Values.ElementaryValue
): Uint8Array {
  if (
    input.type.typeClass === "string" ||
    (input.type.typeClass === "bytes" && input.type.kind === "dynamic")
  ) {
    return BytesEncode.encodeBytes(<
      Format.Values.StringValue | Format.Values.BytesDynamicValue
    >input);
  } else {
    return BasicEncode.encodeBasic(input);
  }
}

/**
 * @Category Encoding (low-level)
 */
export function mappingKeyAsHex(input: Format.Values.ElementaryValue): string {
  return Conversion.toHexString(encodeMappingKey(input));
}
