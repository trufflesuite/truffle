import debugModule from "debug";
const debug = debugModule("codec:wrap:messages");

import type BN from "bn.js";
import type { IntegerOrEnumType, DecimalType } from "./types";
import * as Format from "@truffle/codec/format";

export function wrongArrayLengthMessage(expected: number | BN, got: number): string {
  return `Incorrect array length (expected ${expected.toString()} entries, got ${got})`;
}

export const errorResultMessage: string =
  "Input is a wrapped result representing an error rather than a value";
export const notAStringMessage: string =
  "Input was not a string, type/value pair, or wrapped or boxed string";
export const nonIntegerMessage: string = "Input numeric value was not an integer";
export const nonNumericMessage: string = "Input string was not numeric";
export const nonSafeMessage: string = "Input number is not a Javascript safe integer";
export const badEnumMessage: string =
  "Input string was neither numeric nor a valid enum value";
export const outOfRangeMessage: string = "Input is outside the range of this numeric type";
export const outOfRangeEnumMessage: string = "Input is outside the range of this enum type";
export const checksumFailedMessage: string =
  "Address checksum failed (use all lowercase or all uppercase to circumvent)";
export const invalidUtf16Message: string  = "Input string was not valid UTF-16";
export const looseModeOnlyMessage: string = "Numeric input for bytes is only allowed in loose mode and only for dynamic-length bytestrings";
export const negativeBytesMessage: string = "Input for bytes cannot be negative";

export function wrappedTypeMessage(dataType: Format.Types.Type): string {
  return `Input is a wrapped value of type ${Format.Types.typeString(
    dataType
  )}`;
}
export function specifiedTypeMessage(dataType: string): string {
  return `Input had type explicitly specified as ${dataType}`;
}
export function overlongMessage(expected: number, got: number): string {
  return `Input is too long for type (expected ${expected} bytes, got ${got} bytes)`;
}
export function tooPreciseMessage(expected: number, got: number): string {
  return `Input has too many decimal places for type (expected ${expected} decimal places, got ${got} decimal places)`;
}
export function notABytestringMessage(what: string): string {
  return `${what} is not a valid bytestring (even-length hex string)`;
}
export function wrongLengthMessage(
  what: string,
  expected: number,
  got: number
): string {
  return `Input ${what} was ${got} bytes instead of ${expected} bytes`;
}

export function unrecognizedNumberMessage(
  dataType: IntegerOrEnumType | DecimalType
): string {
  const enumMessage = dataType.typeClass === "enum"
    ? "enum value name, "
    : "";
  const byteArrayMessage =
    dataType.typeClass !== "fixed" && dataType.typeClass !== "ufixed"
      ? "byte-array-like, "
      : "";
  return `Input was not a number, big integer, numeric string, ${enumMessage}type/value pair, boxed number, ${byteArrayMessage}wrapped number or enum, or recognized big number class`
}
