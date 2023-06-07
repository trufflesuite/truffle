import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FixedPaddingError } from "./format.errors.fixed-padding-error";

export const { FixedError } = createCodecComponent(
  "FixedError",
  (data: Format.Errors.FixedError) => <FixedPaddingError data={data} />
);
