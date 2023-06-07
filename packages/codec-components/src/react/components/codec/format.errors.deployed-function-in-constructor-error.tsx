import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { DeployedFunctionInConstructorError } = createCodecComponent(
  "DeployedFunctionInConstructorError",
  (data: Format.Errors.DeployedFunctionInConstructorError) => (
    // TODO
    <span>{data.constructorProgramCounter.toString()}</span>
  )
);
