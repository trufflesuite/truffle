import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { IntPaddingError } from "./format.errors.int-padding-error";

export const { IntError } = createCodecComponent(
  "IntError",
  (data: Format.Errors.IntError) => <IntPaddingError data={data} />
);
