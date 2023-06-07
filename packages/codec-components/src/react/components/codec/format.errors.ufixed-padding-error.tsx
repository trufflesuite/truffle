import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { UfixedPaddingError } = createCodecComponent(
  "UfixedPaddingError",
  // TODO
  (data: Format.Errors.UfixedPaddingError) => <span>{data.raw}</span>
);
