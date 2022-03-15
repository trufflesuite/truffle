import type * as Format from "@truffle/codec/format";
import * as Conversion from "@truffle/codec/conversion";

//UGH -- it turns out TypeScript can't handle nested tagged unions
//see: https://github.com/microsoft/TypeScript/issues/18758
//so, I'm just going to have to throw in a bunch of type coercions >_>

/**
 * Encodes without padding, length, etc!
 *
 * @Category Encoding (low-level)
 */
export function encodeBytes(
  input: Format.Values.BytesDynamicValue | Format.Values.StringValue
): Uint8Array {
  switch (input.type.typeClass) {
    case "bytes":
      return Conversion.toBytes((<Format.Values.BytesValue>input).value.asHex);
    case "string": {
      let coercedInput: Format.Values.StringValue = <Format.Values.StringValue>(
        input
      );
      switch (coercedInput.value.kind) {
        case "valid":
          return Conversion.stringToBytes(coercedInput.value.asString);
        case "malformed":
          return Conversion.toBytes(coercedInput.value.asHex);
      }
    }
  }
}
