import * as Format from "@truffle/codec/format";
import * as Conversion from "@truffle/codec/conversion";
import * as Evm from "@truffle/codec/evm";

//UGH -- it turns out TypeScript can't handle nested tagged unions
//see: https://github.com/microsoft/TypeScript/issues/18758
//so, I'm just going to have to throw in a bunch of type coercions >_>

/**
 * Handles encoding of basic types; returns undefined if the input is bad for
 * some reason -- please don't call it in such situations!
 * @Category Encoding (low-level)
 */
export function encodeBasic(
  input: Format.Values.Value
): Uint8Array | undefined {
  let bytes: Uint8Array;
  switch (input.type.typeClass) {
    case "uint":
    case "int":
      return Conversion.toBytes(
        (<Format.Values.UintValue | Format.Values.IntValue>input).value.asBN,
        Evm.Utils.WORD_SIZE
      );
    case "enum":
      return Conversion.toBytes(
        (<Format.Values.EnumValue>input).value.numericAsBN,
        Evm.Utils.WORD_SIZE
      );
    case "bool": {
      bytes = new Uint8Array(Evm.Utils.WORD_SIZE); //is initialized to zeroes
      if ((<Format.Values.BoolValue>input).value.asBoolean) {
        bytes[Evm.Utils.WORD_SIZE - 1] = 1;
      }
      return bytes;
    }
    case "bytes":
      switch (input.type.kind) {
        case "static":
          bytes = Conversion.toBytes(
            (<Format.Values.BytesValue>input).value.asHex
          );
          let padded = new Uint8Array(Evm.Utils.WORD_SIZE); //initialized to zeroes
          padded.set(bytes);
          return padded;
        case "dynamic":
          //not a basic type!
          return undefined;
      }
    case "address":
      return Conversion.toBytes(
        (<Format.Values.AddressValue>input).value.asAddress,
        Evm.Utils.WORD_SIZE
      );
    case "contract":
      return Conversion.toBytes(
        (<Format.Values.ContractValue>input).value.address,
        Evm.Utils.WORD_SIZE
      );
    case "function": {
      switch (input.type.visibility) {
        case "internal":
          //for our purposes here, we will NOT count internal functions as a
          //basic type!
          return undefined;
        case "external":
          let coercedInput: Format.Values.FunctionExternalValue = <
            Format.Values.FunctionExternalValue
          >input;
          let encoded = new Uint8Array(Evm.Utils.WORD_SIZE); //starts filled w/0s
          let addressBytes = Conversion.toBytes(
            coercedInput.value.contract.address
          ); //should already be correct length
          let selectorBytes = Conversion.toBytes(coercedInput.value.selector); //should already be correct length
          encoded.set(addressBytes);
          encoded.set(selectorBytes, Evm.Utils.ADDRESS_SIZE); //set it after the address
          return encoded;
      }
    }
    case "fixed":
    case "ufixed":
      let bigValue = (<Format.Values.FixedValue | Format.Values.UfixedValue>(
        input
      )).value.asBig;
      let shiftedValue = Conversion.shiftBigUp(bigValue, input.type.places);
      return Conversion.toBytes(shiftedValue, Evm.Utils.WORD_SIZE);
    default:
      return undefined;
  }
}
