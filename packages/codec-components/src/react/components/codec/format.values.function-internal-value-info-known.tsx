import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { FunctionInternalValueInfoKnown } = createCodecComponent(
  "FunctionInternalValueInfoKnown",
  (data: Format.Values.FunctionInternalValueInfoKnown) => (
    // TODO
    <span>{data.name}</span>
  )
);
