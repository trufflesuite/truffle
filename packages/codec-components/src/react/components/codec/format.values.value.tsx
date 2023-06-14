import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ElementaryValue } from "./format.values.elementary-value";
import { ArrayValue } from "./format.values.array-value";
import { MappingValue } from "./format.values.mapping-value";
import { StructValue } from "./format.values.struct-value";
import { TupleValue } from "./format.values.tuple-value";
import { MagicValue } from "./format.values.magic-value";
import { TypeValue } from "./format.values.type-value";
import { FunctionExternalValue } from "./format.values.function-external-value";
import { FunctionInternalValue } from "./format.values.function-internal-value";
import { OptionsValue } from "./format.values.options-value";
import {
  isElementaryValue,
  isArrayValue,
  isMappingValue,
  isStructValue,
  isTupleValue,
  isMagicValue,
  isTypeValue,
  isFunctionExternalValue,
  isFunctionInternalValue
} from "../../../utils";

export const { Value } = createCodecComponent(
  "Value",
  (data: Format.Values.Value) =>
    isElementaryValue(data) ? (
      <ElementaryValue data={data} />
    ) : isArrayValue(data) ? (
      <ArrayValue data={data} />
    ) : isMappingValue(data) ? (
      <MappingValue data={data} />
    ) : isStructValue(data) ? (
      <StructValue data={data} />
    ) : isTupleValue(data) ? (
      <TupleValue data={data} />
    ) : isMagicValue(data) ? (
      <MagicValue data={data} />
    ) : isTypeValue(data) ? (
      <TypeValue data={data} />
    ) : isFunctionExternalValue(data) ? (
      <FunctionExternalValue data={data} />
    ) : isFunctionInternalValue(data) ? (
      <FunctionInternalValue data={data} />
    ) : (
      <OptionsValue data={data} />
    )
);
