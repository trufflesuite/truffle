import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { FunctionInternalPaddingError } = createCodecComponent(
  "FunctionInternalPaddingError",
  // TODO
  (data: Format.Errors.FunctionInternalPaddingError) => <span>{data.raw}</span>
);
