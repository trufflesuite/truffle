import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UfixedPaddingError } from "./format.errors.ufixed-padding-error";

export const { UfixedError } = createCodecComponent(
  "UfixedError",
  (data: Format.Errors.UfixedError) => <UfixedPaddingError data={data} />
);
