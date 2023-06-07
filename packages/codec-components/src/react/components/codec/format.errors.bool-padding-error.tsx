import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { BoolPaddingError } = createCodecComponent(
  "BoolPaddingError",
  // TODO
  (data: Format.Errors.BoolPaddingError) => <span>{data.raw}</span>
);
