import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { FunctionExternalNonStackPaddingError } = createCodecComponent(
  "FunctionExternalNonStackPaddingError",
  (data: Format.Errors.FunctionExternalNonStackPaddingError) => (
    // TODO
    <span>{data.raw}</span>
  )
);
