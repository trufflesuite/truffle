import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintErrorResult } from "./format.errors.uint-error-result";
import { IntErrorResult } from "./format.errors.int-error-result";
import { BoolErrorResult } from "./format.errors.bool-error-result";
import { BytesErrorResult } from "./format.errors.bytes-error-result";
import { AddressErrorResult } from "./format.errors.address-error-result";
import { FixedErrorResult } from "./format.errors.fixed-error-result";
import { UfixedErrorResult } from "./format.errors.ufixed-error-result";
import { StringErrorResult } from "./format.errors.string-error-result";
import { ArrayErrorResult } from "./format.errors.array-error-result";
import { FunctionExternalErrorResult } from "./format.errors.function-external-error-result";
import { TupleErrorResult } from "./format.errors.tuple-error-result";
import {
  isUintErrorResult,
  isIntErrorResult,
  isBoolErrorResult,
  isBytesErrorResult,
  isAddressErrorResult,
  isFixedErrorResult,
  isUfixedErrorResult,
  isStringErrorResult,
  isArrayErrorResult,
  isFunctionExternalErrorResult
} from "../../../utils";

export const { AbiErrorResult } = createCodecComponent(
  "AbiErrorResult",
  (data: Format.Errors.AbiErrorResult) =>
    isUintErrorResult(data) ? (
      <UintErrorResult data={data} />
    ) : isIntErrorResult(data) ? (
      <IntErrorResult data={data} />
    ) : isBoolErrorResult(data) ? (
      <BoolErrorResult data={data} />
    ) : isBytesErrorResult(data) ? (
      <BytesErrorResult data={data} />
    ) : isAddressErrorResult(data) ? (
      <AddressErrorResult data={data} />
    ) : isFixedErrorResult(data) ? (
      <FixedErrorResult data={data} />
    ) : isUfixedErrorResult(data) ? (
      <UfixedErrorResult data={data} />
    ) : isStringErrorResult(data) ? (
      <StringErrorResult data={data} />
    ) : isArrayErrorResult(data) ? (
      <ArrayErrorResult data={data} />
    ) : isFunctionExternalErrorResult(data) ? (
      <FunctionExternalErrorResult data={data} />
    ) : (
      <TupleErrorResult data={data} />
    )
);
