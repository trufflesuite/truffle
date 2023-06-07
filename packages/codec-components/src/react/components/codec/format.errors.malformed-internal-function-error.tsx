import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { MalformedInternalFunctionError } = createCodecComponent(
  "MalformedInternalFunctionError",
  (data: Format.Errors.MalformedInternalFunctionError) => (
    // TODO
    <span>{data.constructorProgramCounter.toString()}</span>
  )
);
