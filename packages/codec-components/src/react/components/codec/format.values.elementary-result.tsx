import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintResult } from "./format.values.uint-result";
import { IntResult } from "./format.values.int-result";
import { BoolResult } from "./format.values.bool-result";
import { BytesResult } from "./format.values.bytes-result";
import { AddressResult } from "./format.values.address-result";
import { StringResult } from "./format.values.string-result";
import { FixedResult } from "./format.values.fixed-result";
import { UfixedResult } from "./format.values.ufixed-result";
import { EnumResult } from "./format.values.enum-result";
import { UserDefinedValueTypeResult } from "./format.values.user-defined-value-type-result";
import { ContractResult } from "./format.values.contract-result";
import {
  isUintResult,
  isIntResult,
  isBoolResult,
  isBytesResult,
  isAddressResult,
  isStringResult,
  isFixedResult,
  isUfixedResult,
  isEnumResult,
  isUserDefinedValueTypeResult
} from "../../../utils";

export const { ElementaryResult } = createCodecComponent(
  "ElementaryResult",
  (data: Format.Values.ElementaryResult) =>
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
    ) : isStringResult(data) ? (
      <StringResult data={data} />
    ) : isFixedResult(data) ? (
      <FixedResult data={data} />
    ) : isUfixedResult(data) ? (
      <UfixedResult data={data} />
    ) : isEnumResult(data) ? (
      <EnumResult data={data} />
    ) : isUserDefinedValueTypeResult(data) ? (
      <UserDefinedValueTypeResult data={data} />
    ) : (
      <ContractResult data={data} />
    )
);
