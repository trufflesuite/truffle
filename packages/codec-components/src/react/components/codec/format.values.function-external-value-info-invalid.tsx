import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { FunctionExternalValueInfoInvalid } = createCodecComponent(
  "FunctionExternalValueInfoInvalid",
  (data: Format.Values.FunctionExternalValueInfoInvalid) => (
    // TODO
    <span>{data.selector}</span>
  )
);
