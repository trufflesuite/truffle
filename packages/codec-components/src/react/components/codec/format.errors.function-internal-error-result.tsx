import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionInternalError } from "./format.errors.function-internal-error";
import { GenericError } from "./format.errors.generic-error";
import { isFunctionInternalError } from "../../../utils";

export const { FunctionInternalErrorResult } = createCodecComponent(
  "FunctionInternalErrorResult",
  ({ error }: Format.Errors.FunctionInternalErrorResult) =>
    isFunctionInternalError(error) ? (
      <FunctionInternalError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
