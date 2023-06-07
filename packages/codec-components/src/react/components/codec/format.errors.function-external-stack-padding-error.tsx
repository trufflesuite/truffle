import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { FunctionExternalStackPaddingError } = createCodecComponent(
  "FunctionExternalStackPaddingError",
  (data: Format.Errors.FunctionExternalStackPaddingError) => (
    // TODO
    <span>{data.rawAddress}</span>
  )
);
