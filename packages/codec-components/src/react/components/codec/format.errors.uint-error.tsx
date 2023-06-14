import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintPaddingError } from "./format.errors.uint-padding-error";

export const { UintError } = createCodecComponent(
  "UintError",
  (data: Format.Errors.UintError) => <UintPaddingError data={data} />
);
