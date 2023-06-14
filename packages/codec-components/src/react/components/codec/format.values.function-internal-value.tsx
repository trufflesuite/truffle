import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionInternalValueInfo } from "./format.values.function-internal-value-info";

export const { FunctionInternalValue } = createCodecComponent(
  "FunctionInternalValue",
  ({ value }: Format.Values.FunctionInternalValue) => (
    <FunctionInternalValueInfo data={value} />
  )
);
