import debugModule from "debug";
const debug = debugModule("codec:wrap:string");

import type * as Format from "@truffle/codec/format";
import { wrapWithCases } from "./dispatch";
import { TypeMismatchError } from "./errors";
import type { WrapResponse } from "../types";
import type { Case, WrapOptions } from "./types";
import { decodeString } from "@truffle/codec/bytes/decode";
import { validateUint8ArrayLike } from "./bytes";
import * as Utils from "./utils";
import * as Messages from "./messages";

const stringCasesBasic: Case<
  Format.Types.StringType,
  Format.Values.StringValue,
  never
>[] = [
  stringFromString,
  stringFromBoxedString,
  stringFromCodecStringValue,
  stringFromUint8ArrayLike,
  stringFailureCase
];

export const stringCases: Case<
  Format.Types.StringType,
  Format.Values.StringValue,
  never
>[] = [stringFromTypeValueInput, ...stringCasesBasic];

function* stringFromString(
  dataType: Format.Types.StringType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.StringValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (!Utils.isValidUtf16(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.invalidUtf16Message
    );
  }
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      kind: "valid",
      asString: input
    }
  };
}

function* stringFromBoxedString(
  dataType: Format.Types.StringType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.StringValue, WrapResponse> {
  if (!Utils.isBoxedString(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a boxed string"
    );
  }
  //defer to primitive string case
  return yield* stringFromString(dataType, input.valueOf(), wrapOptions);
}

function* stringFromCodecStringValue(
  dataType: Format.Types.StringType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.StringValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (input.type.typeClass !== "string") {
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
  //rather than dealing with the different kinds in this case
  //for rewrapping, we'll just rewrap directly;
  //yes, this is a bit inconsistent with how we handle this case for other types
  return {
    type: dataType,
    kind: "value" as const,
    value: (<Format.Values.StringValue>input).value
  };
}

function* stringFromUint8ArrayLike(
  dataType: Format.Types.StringType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.StringValue, WrapResponse> {
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
  const info = decodeString(new Uint8Array(input));
  return {
    type: dataType,
    kind: "value" as const,
    value: info
  };
}

function* stringFromTypeValueInput(
  dataType: Format.Types.StringType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.StringValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (input.type !== "string") {
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
    stringCasesBasic
  );
}

function* stringFailureCase(
  dataType: Format.Types.StringType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, never, WrapResponse> {
  throw new TypeMismatchError(
    dataType,
    input,
    wrapOptions.name,
    2,
    Messages.notAStringMessage
  );
}
