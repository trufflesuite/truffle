import debugModule from "debug";
const debug = debugModule("codec:wrap:function");

import * as Format from "@truffle/codec/format";
import { wrapWithCases } from "./dispatch";
import { TypeMismatchError } from "./errors";
import type {
  WrapRequest,
  WrapResponse
} from "../types";
import type { Case, WrapOptions } from "./types";
import * as Messages from "./messages";
import * as Conversion from "@truffle/codec/conversion";
import * as Utils from "./utils";
import * as EvmUtils from "@truffle/codec/evm/utils";
import type { Options } from "@truffle/codec/common";
const Web3Utils = require("web3-utils"); //importing untyped, sorry!

import { addressCases } from "./address";
import { bytesCases } from "./bytes";

const functionExternalCasesBasic: Case<
  Format.Types.FunctionExternalType,
  Format.Values.FunctionExternalValue,
  WrapRequest
>[] = [
  functionFromFunctionExternalInput,
  functionFromHexString,
  functionFromCodecFunctionExternalValue,
  functionFailureCase
];

export const functionExternalCases: Case<
  Format.Types.FunctionExternalType,
  Format.Values.FunctionExternalValue,
  WrapRequest
>[] = [
  functionFromTypeValueInput,
  ...functionExternalCasesBasic
];

function* functionFromFunctionExternalInput(
  dataType: Format.Types.FunctionExternalType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.FunctionExternalValue, WrapResponse> {
  if(!Utils.isFunctionExternalInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not an object with address & selector"
    );
  }
  const wrappedAddress = <Format.Values.AddressValue>(
    yield* wrapWithCases(
      { typeClass: "address", kind: "general" },
      input.address,
      {
        ...wrapOptions,
        name: `${wrapOptions.name}.address`,
        specificityFloor: 5
      },
      addressCases
    )
  );
  const address = wrappedAddress.value.asAddress;
  const wrappedSelector = yield* wrapWithCases(
    { typeClass: "bytes", kind: "static", length: 4 },
    input.selector,
    {
      ...wrapOptions,
      name: `${wrapOptions.name}.selector`,
      specificityFloor: 5
    },
    bytesCases
  );
  const selector = wrappedSelector.value.asHex;
  //note validation & normalization have already been performed
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      kind: "unknown" as const,
      contract: {
        kind: "unknown" as const,
        address
      },
      selector
    }
  };
}

function* functionFromCodecFunctionExternalValue(
  dataType: Format.Types.FunctionExternalType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.FunctionExternalValue, WrapResponse> {
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
    input.type.typeClass !== "function" ||
    input.type.visibility !== "external"
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
  const coercedInput = <Format.Values.FunctionExternalValue>input;
  const address = coercedInput.value.contract.address;
  const selector = coercedInput.value.selector;
  //we can skip validation & normalization here
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      kind: "unknown" as const,
      contract: {
        kind: "unknown" as const,
        address
      },
      selector
    }
  };
}

function* functionFromHexString(
  dataType: Format.Types.FunctionExternalType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, Format.Values.FunctionExternalValue, WrapResponse> {
  if (typeof input !== "string") {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a string"
    );
  }
  if (!Utils.isByteString(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      "Input was a string, but not a valid even-length hex string"
    );
  }
  if (
    input.length !==
    2 + 2 * (EvmUtils.ADDRESS_SIZE + EvmUtils.SELECTOR_SIZE)
  ) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      5,
      Messages.wrongLengthMessage(
        "external function was given as a string but",
        EvmUtils.ADDRESS_SIZE + EvmUtils.SELECTOR_SIZE,
        (input.length - 2) / 2
      )
    );
  }
  let address: string = input.slice(0, EvmUtils.ADDRESS_SIZE * 2 + 2).toLowerCase();
  const selector = "0x" + input.slice(EvmUtils.ADDRESS_SIZE * 2 + 2).toLowerCase();
  //address & selector must now have the correct length, and we are deliberately *not*
  //checking the checksum on address in this case.  So, the only thing remaining
  //to do is to normalize address.
  address = Web3Utils.toChecksumAddress(address);
  //...and return
  return {
    type: dataType,
    kind: "value" as const,
    value: {
      kind: "unknown" as const,
      contract: {
        kind: "unknown" as const,
        address
      },
      selector
    }
  };
}

function* functionFromTypeValueInput(
  dataType: Format.Types.FunctionExternalType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<WrapRequest, Format.Values.FunctionExternalValue, WrapResponse> {
  if (!Utils.isTypeValueInput(input)) {
    throw new TypeMismatchError(
      dataType,
      input,
      wrapOptions.name,
      1,
      "Input was not a type/value pair"
    );
  }
  if (input.type !== "function") {
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
    functionExternalCasesBasic
  );
}

function* functionFailureCase(
  dataType: Format.Types.FunctionExternalType,
  input: unknown,
  wrapOptions: WrapOptions
): Generator<never, never, WrapResponse> {
  throw new TypeMismatchError(
    dataType,
    input,
    wrapOptions.name,
    2,
    "Input should be one of: an object with address and selector; a 24-byte hex string; a type/value pair; or a wrapped external function"
  );
}
