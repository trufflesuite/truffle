import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { NoSuchInternalFunctionError } = createCodecComponent(
  "NoSuchInternalFunctionError",
  (data: Format.Errors.NoSuchInternalFunctionError) => (
    // TODO
    <span>{data.constructorProgramCounter.toString()}</span>
  )
);
