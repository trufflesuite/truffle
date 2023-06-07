import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionExternalValue } from "./format.values.function-external-value";
import { FunctionExternalErrorResult } from "./format.errors.function-external-error-result";
import { isFunctionExternalValue } from "../../../utils";

export const { FunctionExternalResult } = createCodecComponent(
  "FunctionExternalResult",
  (data: Format.Values.FunctionExternalResult) =>
    isFunctionExternalValue(data) ? (
      <FunctionExternalValue data={data} />
    ) : (
      <FunctionExternalErrorResult data={data} />
    )
);
