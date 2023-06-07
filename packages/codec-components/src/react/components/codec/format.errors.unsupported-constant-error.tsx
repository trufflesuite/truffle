import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { UnsupportedConstantError } = createCodecComponent(
  "UnsupportedConstantError",
  (data: Format.Errors.UnsupportedConstantError) => (
    // TODO
    <span>{data.definition.name}</span>
  )
);
