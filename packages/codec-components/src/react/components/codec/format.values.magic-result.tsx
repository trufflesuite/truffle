import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { MagicValue } from "./format.values.magic-value";
import { MagicErrorResult } from "./format.errors.magic-error-result";
import { isMagicValue } from "../../../utils";

export const { MagicResult } = createCodecComponent(
  "MagicResult",
  (data: Format.Values.MagicResult) =>
    isMagicValue(data) ? (
      <MagicValue data={data} />
    ) : (
      <MagicErrorResult data={data} />
    )
);
