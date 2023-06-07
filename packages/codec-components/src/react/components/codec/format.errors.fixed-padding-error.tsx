import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { FixedPaddingError } = createCodecComponent(
  "FixedPaddingError",
  // TODO
  (data: Format.Errors.FixedPaddingError) => <span>{data.raw}</span>
);
