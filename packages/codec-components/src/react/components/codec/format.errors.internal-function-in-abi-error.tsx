import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { InternalFunctionInABIError } = createCodecComponent(
  "InternalFunctionInABIError",
  // TODO
  (data: Format.Errors.InternalFunctionInABIError) => <span>{data.kind}</span>
);
