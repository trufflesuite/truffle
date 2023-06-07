import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ElementaryErrorResult } from "./format.errors.elementary-error-result";
import { ArrayErrorResult } from "./format.errors.array-error-result";
import { MappingErrorResult } from "./format.errors.mapping-error-result";
import { StructErrorResult } from "./format.errors.struct-error-result";
import { MagicErrorResult } from "./format.errors.magic-error-result";
import { TypeErrorResult } from "./format.errors.type-error-result";
import { TupleErrorResult } from "./format.errors.tuple-error-result";
import { FunctionExternalErrorResult } from "./format.errors.function-external-error-result";
import { FunctionInternalErrorResult } from "./format.errors.function-internal-error-result";
import { OptionsErrorResult } from "./format.errors.options-error-result";
import {
  isElementaryErrorResult,
  isArrayErrorResult,
  isMappingErrorResult,
  isStructErrorResult,
  isMagicErrorResult,
  isTypeErrorResult,
  isTupleErrorResult,
  isFunctionExternalErrorResult,
  isFunctionInternalErrorResult
} from "../../../utils";

export const { ErrorResult } = createCodecComponent(
  "ErrorResult",
  (data: Format.Errors.ErrorResult) =>
    isElementaryErrorResult(data) ? (
      <ElementaryErrorResult data={data} />
    ) : isArrayErrorResult(data) ? (
      <ArrayErrorResult data={data} />
    ) : isMappingErrorResult(data) ? (
      <MappingErrorResult data={data} />
    ) : isStructErrorResult(data) ? (
      <StructErrorResult data={data} />
    ) : isMagicErrorResult(data) ? (
      <MagicErrorResult data={data} />
    ) : isTypeErrorResult(data) ? (
      <TypeErrorResult data={data} />
    ) : isTupleErrorResult(data) ? (
      <TupleErrorResult data={data} />
    ) : isFunctionExternalErrorResult(data) ? (
      <FunctionExternalErrorResult data={data} />
    ) : isFunctionInternalErrorResult(data) ? (
      <FunctionInternalErrorResult data={data} />
    ) : (
      <OptionsErrorResult data={data} />
    )
);
