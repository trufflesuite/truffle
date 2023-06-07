import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintResult } from "./format.values.uint-result";
import { IntResult } from "./format.values.int-result";
import { BoolResult } from "./format.values.bool-result";
import { BytesResult } from "./format.values.bytes-result";
import { AddressResult } from "./format.values.address-result";
import { FixedResult } from "./format.values.fixed-result";
import { UfixedResult } from "./format.values.ufixed-result";
import { StringResult } from "./format.values.string-result";
import { ArrayResult } from "./format.values.array-result";
import { FunctionExternalResult } from "./format.values.function-external-result";
import { TupleResult } from "./format.values.tuple-result";
import {
  isUintResult,
  isIntResult,
  isBoolResult,
  isBytesResult,
  isAddressResult,
  isFixedResult,
  isUfixedResult,
  isStringResult,
  isArrayResult,
  isFunctionExternalResult
} from "../../../utils";

export const { AbiResult } = createCodecComponent(
  "AbiResult",
  (data: Format.Values.AbiResult) =>
    isUintResult(data) ? (
      <UintResult data={data} />
    ) : isIntResult(data) ? (
      <IntResult data={data} />
    ) : isBoolResult(data) ? (
      <BoolResult data={data} />
    ) : isBytesResult(data) ? (
      <BytesResult data={data} />
    ) : isAddressResult(data) ? (
      <AddressResult data={data} />
    ) : isFixedResult(data) ? (
      <FixedResult data={data} />
    ) : isUfixedResult(data) ? (
      <UfixedResult data={data} />
    ) : isStringResult(data) ? (
      <StringResult data={data} />
    ) : isArrayResult(data) ? (
      <ArrayResult data={data} />
    ) : isFunctionExternalResult(data) ? (
      <FunctionExternalResult data={data} />
    ) : (
      <TupleResult data={data} />
    )
);
