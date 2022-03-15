import debugModule from "debug";
const debug = debugModule("codec:wrap:bytes");

import type * as Format from "@truffle/codec/format";
import { wrapWithCases } from "./dispatch";
import { TypeMismatchError, BadResponseTypeError } from "./errors";
import type { IntegerWrapRequest, WrapResponse } from "../types";
import type { Case, WrapOptions, Uint8ArrayLike } from "./types";
import * as Conversion from "@truffle/codec/conversion";
import * as Utils from "./utils";
import * as Messages from "./messages";
import BN from "bn.js";

const bytesFromStringCases: Case<
  Format.Types.BytesType,
  Format.Values.BytesValue,
  never
>[] = [
  bytesFromHexString,
  bytesFromIntegerString //dynamic loose mode only; make sure this goes after hex string case!
];

const bytesCasesBasic: Case<
  Format.Types.BytesType,
  Format.Values.BytesValue,
  IntegerWrapRequest
>[] = [
  ...bytesFromStringCases,
  bytesFromBoxedString,
  bytesFromUint8ArrayLike,
  bytesFromCodecBytesValue,
  bytesFromCodecUdvtValue,
  bytesFromEncodingTextInput,
  bytesFromNumber, //dynamic loose mode only
  bytesFromBoxedNumber, //dynamic loose mode only
  bytesFromBigint, //dynamic loose mode only
  bytesFromBN, //dynamic loose mode only
  bytesFromBig, //dynamic loose mode only
  bytesFromOther //dynamic loose mode only, is failure case otherwise. Make sure this goes last!
];

export const bytesCases: Case<
  Format.Types.BytesType,
  Format.Values.BytesValue,
  IntegerWrapRequest
>[] = [bytesFromTypeValueInput, ...bytesCasesBasic];

function* bytesFromHexString(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  const trimmed = Utils.removeUnderscoresHex(input);
  //(but not between individual hex digits)
  if (!Utils.isByteString(trimmed)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.notABytestringMessage("Input")
    );
  }
  const asHex = validateAndPad(dataType, trimmed, input, wrapOptions.name);
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromIntegerString(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!wrapOptions.loose || dataType.kind === "static") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.looseModeOnlyMessage
    );
  }
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (input.trim() === "") {
    //bigint accepts this but we shouldn't
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.notABytestringMessage("Input")
    );
  }
  const trimmed = Utils.removeUnderscoresNumeric(input);
  let asBigInt: bigint;
  try {
    //we'll use BigInt to parse integer strings, as it's pretty good at it.
    //Note that it accepts hex/octal/binary with prefixes 0x, 0o, 0b.
    asBigInt = BigInt(trimmed);
  } catch {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input string was not a byte string or integer string"
    );
  }
  if (asBigInt < 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.negativeBytesMessage
    );
  }
  let asHex = Conversion.toHexString(asBigInt);
  asHex = adjustZeroNumericInput(asHex);
  //because we're in dynamic case, we can skip validateAndPad
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromBoxedString(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!Utils.isBoxedString(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a boxed string"
    );
  }
  //defer to primitive string cases
  return yield* wrapWithCases(
    dataType,
    input.valueOf(),
    wrapOptions,
    bytesFromStringCases
  );
}

function* bytesFromUint8ArrayLike(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!Utils.isUint8ArrayLike(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a Uint8Array-like"
    );
  }
  //the next series of checks is delegated to a helper fn
  validateUint8ArrayLike(input, dataType, wrapOptions.name); //(this fn just throws an appropriate error if something's bad)
  let asHex = Conversion.toHexString(new Uint8Array(input)); //I am surprised TS accepts this!
  asHex = validateAndPad(dataType, asHex, input, wrapOptions.name);
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromEncodingTextInput(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!Utils.isEncodingTextInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a in encoding/text form"
    );
  }
  if (input.encoding !== "utf8") {
    //(the only allowed encoding :P )
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      `Unknown or unsupported text encoding ${input.encoding}`
    );
  }
  let asHex: string;
  try {
    asHex = Conversion.toHexString(Conversion.stringToBytes(input.text));
  } catch {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.invalidUtf16Message
    );
  }
  asHex = validateAndPad(dataType, asHex, input, wrapOptions.name);
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromCodecBytesValue(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "bytes") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  if (input.kind !== "value") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.errorResultMessage
    );
  }
  if (
    !wrapOptions.loose &&
    !(input.type.kind === "dynamic" && dataType.kind === "dynamic") &&
    !(
      input.type.kind === "static" &&
      dataType.kind === "static" &&
      input.type.length === dataType.length
    )
  ) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  let asHex = (<Format.Values.BytesValue>input).value.asHex;
  asHex = validateAndPad(dataType, asHex, input, wrapOptions.name);
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromCodecUdvtValue(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "userDefinedValueType") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.wrappedTypeMessage(input.type)
    );
  }
  if (input.kind !== "value") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.errorResultMessage
    );
  }
  return yield* bytesFromCodecBytesValue(dataType, input.value, wrapOptions);
}

function* bytesFromTypeValueInput(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<IntegerWrapRequest, Format.Values.BytesValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (!input.type.match(/^byte(s\d*)?$/)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.specifiedTypeMessage(input.type)
    );
  }
  debug("input.type: %s", input.type);
  //now: determine the specified length; we use "null" for dynamic
  //note that "byte" is allowed, with a length of 1
  let length: number | null = null;
  let match = input.type.match(/^bytes(\d+)$/);
  if (match) {
    length = Number(match[1]); //static case with specified number
  } else if (input.type === "byte") {
    //"byte" case; set length to 1
    length = 1;
  }
  //otherwise, it's dynamic, so leave it at the default of null
  debug("length: %o", length);
  //check: does the specified length match the data type length?
  if (
    !(length === null && dataType.kind === "dynamic") &&
    !(dataType.kind === "static" && length === dataType.length)
  ) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.specifiedTypeMessage(input.type)
    );
  }
  //extract value & try again, with loose option turned on
  return yield* wrapWithCases(
    dataType,
    input.value,
    { ...wrapOptions, loose: true },
    bytesCasesBasic
  );
}

function* bytesFromNumber(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!wrapOptions.loose || dataType.kind === "static") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.looseModeOnlyMessage
    );
  }
  if (typeof input !== "number") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a number"
    );
  }
  if (!Number.isInteger(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.nonIntegerMessage
    );
  }
  if (!Number.isSafeInteger(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.nonSafeMessage
    );
  }
  if (input < 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.negativeBytesMessage
    );
  }
  let asHex = Conversion.toHexString(input);
  asHex = adjustZeroNumericInput(asHex);
  //because we're in dynamic case, we can skip validateAndPad
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromBoxedNumber(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  //skipping the wrapOptions.loose check, as that'll get checked
  //in bytesFromNumber
  if (!Utils.isBoxedNumber(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a boxed number"
    );
  }
  //unbox and try again
  return yield* bytesFromNumber(dataType, input.valueOf(), wrapOptions);
}

function* bytesFromBigint(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!wrapOptions.loose || dataType.kind === "static") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.looseModeOnlyMessage
    );
  }
  if (typeof input !== "bigint") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a bigint"
    );
  }
  if (input < 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.negativeBytesMessage
    );
  }
  let asHex = Conversion.toHexString(input);
  asHex = adjustZeroNumericInput(asHex);
  //because we're in dynamic case, we can skip validateAndPad
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromBN(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!wrapOptions.loose || dataType.kind === "static") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.looseModeOnlyMessage
    );
  }
  if (!BN.isBN(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a BN"
    );
  }
  if (input.isNeg()) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.negativeBytesMessage
    );
  }
  let asHex = Conversion.toHexString(input);
  asHex = adjustZeroNumericInput(asHex);
  //because we're in dynamic case, we can skip validateAndPad
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromBig(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.BytesValue, WrapResponse> {
  if (!wrapOptions.loose || dataType.kind === "static") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      Messages.looseModeOnlyMessage
    );
  }
  if (!Conversion.isBig(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a Big"
    );
  }
  if (Conversion.countDecimalPlaces(input) !== 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.nonIntegerMessage
    );
  }
  if (input.lt(0)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.negativeBytesMessage
    );
  }
  let asHex = Conversion.toHexString(input);
  asHex = adjustZeroNumericInput(asHex);
  //because we're in dynamic case, we can skip validateAndPad
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

function* bytesFromOther(
  dataType: Format.Types.BytesType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<IntegerWrapRequest, Format.Values.BytesValue, WrapResponse> {
  if (!wrapOptions.loose || dataType.kind === "static") {
    //outside of the dynamic-loose case, this is just a failure case
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      2,
      "Input was not a hex string, byte-array-alike, encoding/text pair, type/value pair, or wrapped bytestring"
    );
  }
  const request = { kind: "integer" as const, input };
  const response = yield request;
  if (response.kind !== "integer") {
    throw new BadResponseTypeError(request, response);
  }
  if (response.value === null) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      response.partiallyRecognized ? 5 : 3,
      response.reason ||
        "Input was not a hex string, byte-array-alike, encoding/text pair, type/value pair, integer input, or wrapped bytestring"
    );
  }
  if (response.value < 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.negativeBytesMessage
    );
  }
  let asHex = Conversion.toHexString(response.value);
  asHex = adjustZeroNumericInput(asHex);
  //because we're in dynamic case, we can skip validateAndPad
  return <Format.Values.BytesValue>{
    //TS is complaining again
    type: dataType,
    kind: "value" as const,
    value: {
      asHex
    }
  };
}

export function validateUint8ArrayLike(
  input: Uint8ArrayLike,
  dataType: Format.Types.Type, //for error information
  name: string //for error information
): void {
  //this function doesn't return anything, it just throws errors if something
  //goes wrong
  if (input instanceof Uint8Array) {
    return; //honest Uint8Arrays don't need checking
  }
  if (!Number.isSafeInteger(input.length)) {
    throw new TypeMismatchError(
      dataType,
      input,
      name,
      5,
      "Input is byte-array-like, but its length is not a safe integer"
    );
  }
  if (input.length < 0) {
    throw new TypeMismatchError(
      dataType,
      input,
      name,
      5,
      "Input is byte-array-like, but its length is negative"
    );
  }
  //check: is it actually like a Uint8Array?
  for (let index = 0; index < input.length; index++) {
    if (
      typeof input[index] !== "number" ||
      input[index] < 0 ||
      input[index] >= 256 ||
      !Number.isInteger(input[index])
    ) {
      throw new TypeMismatchError(
        dataType,
        input,
        name,
        5,
        `Input is byte-array-like, but byte ${index} is not a 1-byte value (number from 0 to 255)`
      );
    }
  }
  //otherwise, we didn't throw any errors, so return
}

function validateAndPad(
  dataType: Format.Types.BytesType,
  asHex: string,
  input: unknown, //for errors
  name: string //for errors
): string {
  asHex = asHex.toLowerCase();
  //if static, validate and pad
  if (dataType.kind === "static") {
    if ((asHex.length - 2) / 2 > dataType.length) {
      throw new TypeMismatchError(
        dataType,
        input,
        name,
        5,
        Messages.overlongMessage(dataType.length, (asHex.length - 2) / 2)
      );
    } else {
      asHex = asHex.padEnd(dataType.length * 2 + 2, "00");
    }
  }
  return asHex;
}

//special case for ethers compatibility; represents 0 as 0x00 rather than 0x.
//only for numeric input in loose mode, in dynamic case, for compatibility; not
//for ordinary hex input, where the two are distinct!
function adjustZeroNumericInput(asHex: string): string {
  return asHex === "0x" ? "0x00" : asHex;
}
