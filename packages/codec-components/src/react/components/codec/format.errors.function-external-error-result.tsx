import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionExternalError } from "./format.errors.function-external-error";
import { GenericError } from "./format.errors.generic-error";
import { isFunctionExternalError } from "../../../utils";

export const { FunctionExternalErrorResult } = createCodecComponent(
  "FunctionExternalErrorResult",
  ({ error }: Format.Errors.FunctionExternalErrorResult) =>
    isFunctionExternalError(error) ? (
      <FunctionExternalError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
