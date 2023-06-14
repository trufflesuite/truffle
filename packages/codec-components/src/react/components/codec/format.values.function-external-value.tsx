import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionExternalValueInfo } from "./format.values.function-external-value-info";

export const { FunctionExternalValue } = createCodecComponent(
  "FunctionExternalValue",
  ({ value }: Format.Values.FunctionExternalValue) => (
    <FunctionExternalValueInfo data={value} />
  )
);
