import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintValue } from "./format.values.uint-value";
import { IntValue } from "./format.values.int-value";
import { BoolValue } from "./format.values.bool-value";
import { BytesValue } from "./format.values.bytes-value";
import { AddressValue } from "./format.values.address-value";
import { FixedValue } from "./format.values.fixed-value";
import { UfixedValue } from "./format.values.ufixed-value";
import { StringValue } from "./format.values.string-value";
import { ArrayValue } from "./format.values.array-value";
import { FunctionExternalValue } from "./format.values.function-external-value";
import { TupleValue } from "./format.values.tuple-value";
import {
  isUintValue,
  isIntValue,
  isBoolValue,
  isBytesValue,
  isAddressValue,
  isFixedValue,
  isUfixedValue,
  isStringValue,
  isArrayValue,
  isFunctionExternalValue
} from "../../../utils";

export const { AbiValue } = createCodecComponent(
  "AbiValue",
  (data: Format.Values.AbiValue) =>
    isUintValue(data) ? (
      <UintValue data={data} />
    ) : isIntValue(data) ? (
      <IntValue data={data} />
    ) : isBoolValue(data) ? (
      <BoolValue data={data} />
    ) : isBytesValue(data) ? (
      <BytesValue data={data} />
    ) : isAddressValue(data) ? (
      <AddressValue data={data} />
    ) : isFixedValue(data) ? (
      <FixedValue data={data} />
    ) : isUfixedValue(data) ? (
      <UfixedValue data={data} />
    ) : isStringValue(data) ? (
      <StringValue data={data} />
    ) : isArrayValue(data) ? (
      <ArrayValue data={data} />
    ) : isFunctionExternalValue(data) ? (
      <FunctionExternalValue data={data} />
    ) : (
      <TupleValue data={data} />
    )
);
