import * as Format from "@truffle/codec/format";
import * as Conversion from "@truffle/codec/conversion";
import * as Evm from "@truffle/codec/evm";
import utf8 from "utf8";

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
  let bytes: Uint8Array;
  switch (input.type.typeClass) {
    case "bytes":
      return Conversion.toBytes((<Format.Values.BytesValue>input).value.asHex);
    case "string": {
      let coercedInput: Format.Values.StringValue = <Format.Values.StringValue>(
        input
      );
      switch (coercedInput.value.kind) {
        case "valid":
          return stringToBytes(coercedInput.value.asString);
        case "malformed":
          return Conversion.toBytes(coercedInput.value.asHex);
      }
    }
  }
}

/**
 * @Category Encoding (low-level)
 */
function stringToBytes(input: string): Uint8Array {
  input = utf8.encode(input);
  let bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    bytes[i] = input.charCodeAt(i);
  }
  return bytes;
  //NOTE: this will throw an error if the string contained malformed UTF-16!
  //but, well, it shouldn't contain that...
}
