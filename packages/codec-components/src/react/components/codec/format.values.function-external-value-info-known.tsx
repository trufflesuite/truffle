import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { FunctionExternalValueInfoKnown } = createCodecComponent(
  "FunctionExternalValueInfoKnown",
  (data: Format.Values.FunctionExternalValueInfoKnown) => (
    // TODO
    <span>{data.abi.name}</span>
  )
);
