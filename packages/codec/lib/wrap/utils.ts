import type {
  NumericType,
  DecimalType,
  TypeValueInput,
  ContractInput,
  FunctionExternalInput,
  Uint8ArrayLike,
  EncodingTextInput
} from "./types";
import type * as Format from "@truffle/codec/format";
import Big from "big.js";
import * as Conversion from "@truffle/codec/conversion";
import isBoolean from "lodash/isBoolean"; //recognizes boolean *or* Boolean
import isString from "lodash/isString"; //recognizes string *or* String
import isNumber from "lodash/isNumber"; //recognizes number *or* Number
import utf8 from "utf8";

export function places(dataType: NumericType): number {
  switch (dataType.typeClass) {
    case "int":
    case "uint":
      return 0;
    case "fixed":
    case "ufixed":
      return dataType.places;
  }
}

export function maxValue(dataType: NumericType): Big {
  let bits = dataType.bits;
  if (dataType.typeClass === "int" || dataType.typeClass === "fixed") {
    bits -= 1; //subtract 1 for signed
  }
  const maxIntegerValue = new Big(2).pow(bits).minus(1);
  return Conversion.shiftBigDown(maxIntegerValue, places(dataType));
}

export function minValue(dataType: NumericType): Big {
  if (dataType.typeClass === "uint" || dataType.typeClass === "ufixed") {
    return new Big(0);
  }
  const minIntegerValue = new Big(0).minus(new Big(2).pow(dataType.bits));
  return Conversion.shiftBigDown(minIntegerValue, places(dataType));
}

export function isSafeNumber(dataType: DecimalType, input: number): boolean {
  const scaledUp = input * 10 ** dataType.places;
  return (
    Number.MIN_SAFE_INTEGER <= scaledUp && scaledUp <= Number.MAX_SAFE_INTEGER
  );
}

export function isTypeValueInput(input: any): input is TypeValueInput {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof input.type === "string" &&
    "value" in input &&
    Object.keys(input).length === 2
  );
}

export function isEncodingTextInput(input: any): input is EncodingTextInput {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof input.encoding === "string" &&
    typeof input.text === "string" &&
    Object.keys(input).length === 2
  );
}

export function isContractInput(input: any): input is ContractInput {
  return (
    (typeof input === "object" || typeof input === "function") &&
    input !== null &&
    typeof input.address === "string" &&
    //we *don't* check anything more for addresses, we'll let the
    //address wrapper handle that
    !("selector" in input)
  );
}

export function isFunctionExternalInput(
  input: any
): input is FunctionExternalInput {
  return (
    (typeof input === "object" || typeof input === "function") &&
    input !== null &&
    "address" in input &&
    "selector" in input
  );
}

export function isWrappedResult(input: any): input is Format.Values.Result {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof input.type === "object" &&
    input.type !== null &&
    typeof input.type.typeClass === "string" &&
    ((input.kind === "value" && typeof input.value === "object") ||
      (input.kind === "error" && typeof input.error === "object"))
  );
}

export function isUint8ArrayLike(input: any): input is Uint8ArrayLike {
  return (
    input instanceof Uint8Array ||
    (typeof input === "object" &&
      input !== null &&
      typeof input.length === "number")
  );
}

//hack?
export function isPlainObject(input: any): input is { [key: string]: unknown } {
  return typeof input === "object" && input !== null;
}

export function isBase64(input: string): boolean {
  const base64Pattern =
    /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}([A-Za-z0-9+/]|=)=)?$/; //Vim's syntax highlighting is wrong here
  return Boolean(input.match(base64Pattern));
}

export function base64Length(base64: string): number {
  const [_, endingEquals] = base64.match(/(=*)$/); //note this match always succeeds
  return (base64.length * 3) / 4 - endingEquals.length;
}

export function isHexString(input: string): boolean {
  //(with prefix, to be clear)
  const hexStringPattern = /^0[xX][0-9a-fA-F]*$/;
  return Boolean(input.match(hexStringPattern));
}

export function isPrefixlessHexString(input: string): boolean {
  const shortHexStringPattern = /^[0-9a-fA-F]*$/;
  return Boolean(input.match(shortHexStringPattern));
}

export function isByteString(input: string): boolean {
  const byteStringPattern = /^0[xX]([0-9a-fA-F]{2})*$/;
  return Boolean(input.match(byteStringPattern));
}

export function isByteStringWithUnderscores(input: string): boolean {
  const byteStringWithUnderscoresPattern =
    /^0[xX](([0-9a-fA-F]{2}_?)*([0-9a-fA-F]{2}))?$/;
  return Boolean(input.match(byteStringWithUnderscoresPattern));
}

export function isBoxedString(input: any): input is String {
  //unfortunately, isString has been typed incorrectly.
  //it should return `input is string|String`, but instead it
  //incorrectly returns `input is string`.  As such, we have
  //to work around its incorrect typing here.
  return isString(input) && typeof (<string | String>input) !== "string";
}

export function isBoxedNumber(input: any): input is Number {
  //see comment on isBoxedString
  return isNumber(input) && typeof (<number | Number>input) !== "number";
}

export function isBoxedBoolean(input: any): input is Boolean {
  //see comment on isBoxedString
  return isBoolean(input) && typeof (<boolean | Boolean>input) !== "boolean";
}

export function isBoxedPrimitive(
  input: any
): input is String | Number | Boolean {
  return isBoxedString(input) || isBoxedNumber(input) || isBoxedBoolean(input);
}

export function isValidUtf16(input: string): boolean {
  try {
    utf8.encode(input); //encode but discard :P
    return true;
  } catch {
    return false;
  }
}

export function removeUnderscoresNumeric(numeric: string): string {
  //if it contains 0x or 0X, treat as hex;
  //otherwise, treat as non-hex (decimal/octal/binary)
  return numeric.match(/0x/i)
    ? removeUnderscoresHex(numeric)
    : removeUnderscoresNoHex(numeric);
}

export function removeUnderscoresNoHex(numeric: string): string {
  //this would be easy with lookbehind assertions, but those aren't safe to use
  //in all browsers, so, we're going to have to do things a bit more
  //manually...
  return removeUnderscoresWithRegex(numeric, /\d_\d/);
}

export function removeUnderscoresHex(hex: string): string {
  //same comment
  return removeUnderscoresWithRegex(hex, /[\da-f]_[\da-f]/i);
}

//note: regex should be of the form <A>_<A>, where <A> is a regex that matches
//precisely one character!  this will not work otherwise!
function removeUnderscoresWithRegex(input: string, regex: RegExp): string {
  let match;
  while ((match = input.match(regex))) {
    //replace input by the same thing but w/ the underscore removed,
    //by taking the text before and after the underscore
    input = input.slice(0, match.index + 1) + input.slice(match.index + 2);
  }
  return input;
}
