import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionInternalValue } from "./format.values.function-internal-value";
import { FunctionInternalErrorResult } from "./format.errors.function-internal-error-result";
import { isFunctionInternalValue } from "../../../utils";

export const { FunctionInternalResult } = createCodecComponent(
  "FunctionInternalResult",
  (data: Format.Values.FunctionInternalResult) =>
    isFunctionInternalValue(data) ? (
      <FunctionInternalValue data={data} />
    ) : (
      <FunctionInternalErrorResult data={data} />
    )
);
