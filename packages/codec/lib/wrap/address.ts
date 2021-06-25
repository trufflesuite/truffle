import debugModule from "debug";
const debug = debugModule("codec:wrap:address");

import type * as Format from "@truffle/codec/format";
import { wrapWithCases } from "./dispatch";
import { TypeMismatchError, BadResponseTypeError } from "./errors";
import type { WrapResponse, AddressWrapRequest } from "../types";
import type {
  Case,
  AddressLikeType,
  AddressLikeValue,
  WrapOptions,
} from "./types";
import * as Conversion from "@truffle/codec/conversion";
import * as Utils from "./utils";
import * as EvmUtils from "@truffle/codec/evm/utils";
import * as Messages from "./messages";
const Web3Utils = require("web3-utils"); //importing untyped, sorry!

//no separate cases for contracts; even with loose turned off,
//we consider these interchangeable

const addressFromStringCases: Case<
  AddressLikeType,
  AddressLikeValue,
  AddressWrapRequest
>[] = [
  addressFromHexString,
  addressFromPrefixlessHexString,
  addressFromOtherString, //Please put after other string cases! Also, can yield
];

const addressCasesBasic: Case<
  AddressLikeType,
  AddressLikeValue,
  AddressWrapRequest
>[] = [
  ...addressFromStringCases,
  addressFromBoxedString,
  addressFromContractInput,
  addressFromCodecAddressLikeValue,
  addressFromCodecUdvtValue,
  addressFailureCase
];

export const addressCases: Case<
  AddressLikeType,
  AddressLikeValue,
  AddressWrapRequest
>[] = [
  addressFromTypeValueInput,
  ...addressCasesBasic
];

function* addressFromHexString(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, AddressLikeValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (!Utils.isHexString(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a 0x-prefixed hex string"
    );
  }
  return validateNormalizeAndWrap(dataType, input, input, wrapOptions.name);
}

function* addressFromPrefixlessHexString(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, AddressLikeValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (!Utils.isPrefixlessHexString(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not an unprefixed hex string"
    );
  }
  return validateNormalizeAndWrap(dataType, "0x" + input, input, wrapOptions.name);
}

function* addressFromOtherString(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<AddressWrapRequest, AddressLikeValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  const request = { kind: "address" as const, name: input };
  const response = yield request;
  if (response.kind !== "address") {
    throw new BadResponseTypeError(request, response);
  }
  if (response.address === null) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      response.partiallyRecognized ? 5 : 3,
      response.reason
    );
  }
  //we should be able to skip validation & normalization here
  return wrapAsAppropriateType(dataType, response.address);
}

function* addressFromBoxedString(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<AddressWrapRequest, AddressLikeValue, WrapResponse> {
  if (!Utils.isBoxedString(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a boxed string"
    );
  }
  //unbox and try again
  return yield* wrapWithCases(dataType, input.valueOf(), wrapOptions, addressFromStringCases);
}

function* addressFromContractInput(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, AddressLikeValue, WrapResponse> {
  if (!Utils.isContractInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a contract-like object"
    );
  }
  return validateNormalizeAndWrap(dataType, input.address, input, wrapOptions.name);
}

function* addressFromCodecAddressLikeValue(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, AddressLikeValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (
    input.type.typeClass !== "address" &&
    input.type.typeClass !== "contract"
  ) {
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
  let address: string;
  switch (input.type.typeClass) {
    case "address":
      address = (<Format.Values.AddressValue>input).value.asAddress;
      break;
    case "contract":
      address = (<Format.Values.ContractValue>input).value.address;
      break;
    //other cases are impossible at this point
  }
  //we should be able to skip validation/normalization here
  return wrapAsAppropriateType(dataType, address);
}

function* addressFromCodecUdvtValue(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, AddressLikeValue, WrapResponse> {
  if (!Utils.isWrappedResult(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a wrapped result"
    );
  }
  if (
    input.type.typeClass !== "userDefinedValueType"
  ) {
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
  return yield* addressFromCodecAddressLikeValue(dataType, input.value, wrapOptions);
}

function* addressFromTypeValueInput(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<AddressWrapRequest, AddressLikeValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (input.type !== "address" && input.type !== "contract") {
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
    addressCasesBasic
  );
}

function* addressFailureCase(
  dataType: AddressLikeType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, never, WrapResponse> {
  throw new TypeMismatchError(
    dataType,
    input,
    wrapOptions.name,
    2,
   "Input was not recognizable as an address"
  );
}

function validateAndNormalize(
  asAddress: string,
  dataType: Format.Types.Type, //for errors
  input: unknown, //for errors
  name: string //for errors
): string {
  if (!Utils.isByteString(asAddress)) {
    throw new TypeMismatchError(
      dataType,
      input,
      name,
      5,
      Messages.notABytestringMessage("Address")
    );
  }
  if (asAddress.length !== 2 * EvmUtils.ADDRESS_SIZE + 2) {
    throw new TypeMismatchError(
      dataType,
      input,
      name,
      5,
      Messages.wrongLengthMessage(
        "address",
        EvmUtils.ADDRESS_SIZE,
        (asAddress.length - 2) / 2
      )
    );
  }
  if (!Web3Utils.isAddress(asAddress)) {
    throw new TypeMismatchError(
      dataType,
      input,
      name,
      6, //to beat the one from the yield case :P
      Messages.checksumFailedMessage
    );
  }
  //and normalize
  return Web3Utils.toChecksumAddress(asAddress);
}

function wrapAsAppropriateType(
  dataType: AddressLikeType,
  asAddress: string
): AddressLikeValue {
  //return address or contract value as appropriate
  switch (dataType.typeClass) {
    case "address":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          asAddress
        }
      };
    case "contract":
      return {
        type: dataType,
        kind: "value" as const,
        value: {
          kind: "unknown" as const,
          address: asAddress
        }
      };
  }
}

function validateNormalizeAndWrap(
  dataType: AddressLikeType,
  asAddress: string,
  input: unknown, //for errors
  name: string //for errors
): AddressLikeValue {
  return wrapAsAppropriateType(dataType, validateAndNormalize(asAddress, dataType, input, name));
}
