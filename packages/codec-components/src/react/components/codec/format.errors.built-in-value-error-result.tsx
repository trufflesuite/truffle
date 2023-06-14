import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintErrorResult } from "./format.errors.uint-error-result";
import { IntErrorResult } from "./format.errors.int-error-result";
import { BoolErrorResult } from "./format.errors.bool-error-result";
import { BytesStaticErrorResult } from "./format.errors.bytes-static-error-result";
import { AddressErrorResult } from "./format.errors.address-error-result";
import { FixedErrorResult } from "./format.errors.fixed-error-result";
import { UfixedErrorResult } from "./format.errors.ufixed-error-result";
import {
  isUintErrorResult,
  isIntErrorResult,
  isBoolErrorResult,
  isBytesStaticErrorResult,
  isAddressErrorResult,
  isFixedErrorResult
} from "../../../utils";

export const { BuiltInValueErrorResult } = createCodecComponent(
  "BuiltInValueErrorResult",
  (data: Format.Errors.BuiltInValueErrorResult) =>
    isUintErrorResult(data) ? (
      <UintErrorResult data={data} />
    ) : isIntErrorResult(data) ? (
      <IntErrorResult data={data} />
    ) : isBoolErrorResult(data) ? (
      <BoolErrorResult data={data} />
    ) : isBytesStaticErrorResult(data) ? (
      <BytesStaticErrorResult data={data} />
    ) : isAddressErrorResult(data) ? (
      <AddressErrorResult data={data} />
    ) : isFixedErrorResult(data) ? (
      <FixedErrorResult data={data} />
    ) : (
      <UfixedErrorResult data={data} />
    )
);
