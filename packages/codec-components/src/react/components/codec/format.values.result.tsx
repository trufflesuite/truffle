import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ElementaryResult } from "./format.values.elementary-result";
import { ArrayResult } from "./format.values.array-result";
import { MappingResult } from "./format.values.mapping-result";
import { StructResult } from "./format.values.struct-result";
import { TupleResult } from "./format.values.tuple-result";
import { MagicResult } from "./format.values.magic-result";
import { TypeResult } from "./format.values.type-result";
import { FunctionExternalResult } from "./format.values.function-external-result";
import { FunctionInternalResult } from "./format.values.function-internal-result";
import { OptionsResult } from "./format.values.options-result";
import {
  isElementaryResult,
  isArrayResult,
  isMappingResult,
  isStructResult,
  isTupleResult,
  isMagicResult,
  isTypeResult,
  isFunctionExternalResult,
  isFunctionInternalResult
} from "../../../utils";

export const { Result } = createCodecComponent(
  "Result",
  (data: Format.Values.Result) =>
    isElementaryResult(data) ? (
      <ElementaryResult data={data} />
    ) : isArrayResult(data) ? (
      <ArrayResult data={data} />
    ) : isMappingResult(data) ? (
      <MappingResult data={data} />
    ) : isStructResult(data) ? (
      <StructResult data={data} />
    ) : isTupleResult(data) ? (
      <TupleResult data={data} />
    ) : isMagicResult(data) ? (
      <MagicResult data={data} />
    ) : isTypeResult(data) ? (
      <TypeResult data={data} />
    ) : isFunctionExternalResult(data) ? (
      <FunctionExternalResult data={data} />
    ) : isFunctionInternalResult(data) ? (
      <FunctionInternalResult data={data} />
    ) : (
      <OptionsResult data={data} />
    )
);
