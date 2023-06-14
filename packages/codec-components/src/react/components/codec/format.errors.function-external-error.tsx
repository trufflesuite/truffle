import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionExternalNonStackPaddingError } from "./format.errors.function-external-non-stack-padding-error";
import { FunctionExternalStackPaddingError } from "./format.errors.function-external-stack-padding-error";
import { isFunctionExternalNonStackPaddingError } from "../../../utils";

export const { FunctionExternalError } = createCodecComponent(
  "FunctionExternalError",
  (data: Format.Errors.FunctionExternalError) =>
    isFunctionExternalNonStackPaddingError(data) ? (
      <FunctionExternalNonStackPaddingError data={data} />
    ) : (
      <FunctionExternalStackPaddingError data={data} />
    )
);
