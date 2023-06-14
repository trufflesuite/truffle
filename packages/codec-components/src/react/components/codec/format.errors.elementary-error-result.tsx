import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintErrorResult } from "./format.errors.uint-error-result";
import { IntErrorResult } from "./format.errors.int-error-result";
import { BoolErrorResult } from "./format.errors.bool-error-result";
import { BytesErrorResult } from "./format.errors.bytes-error-result";
import { AddressErrorResult } from "./format.errors.address-error-result";
import { StringErrorResult } from "./format.errors.string-error-result";
import { FixedErrorResult } from "./format.errors.fixed-error-result";
import { UfixedErrorResult } from "./format.errors.ufixed-error-result";
import { EnumErrorResult } from "./format.errors.enum-error-result";
import { UserDefinedValueTypeErrorResult } from "./format.errors.user-defined-value-type-error-result";
import { ContractErrorResult } from "./format.errors.contract-error-result";
import {
  isUintErrorResult,
  isIntErrorResult,
  isBoolErrorResult,
  isBytesErrorResult,
  isAddressErrorResult,
  isStringErrorResult,
  isFixedErrorResult,
  isUfixedErrorResult,
  isEnumErrorResult,
  isUserDefinedValueTypeErrorResult
} from "../../../utils";

export const { ElementaryErrorResult } = createCodecComponent(
  "ElementaryErrorResult",
  (data: Format.Errors.ElementaryErrorResult) =>
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
    ) : isStringErrorResult(data) ? (
      <StringErrorResult data={data} />
    ) : isFixedErrorResult(data) ? (
      <FixedErrorResult data={data} />
    ) : isUfixedErrorResult(data) ? (
      <UfixedErrorResult data={data} />
    ) : isEnumErrorResult(data) ? (
      <EnumErrorResult data={data} />
    ) : isUserDefinedValueTypeErrorResult(data) ? (
      <UserDefinedValueTypeErrorResult data={data} />
    ) : (
      <ContractErrorResult data={data} />
    )
);
