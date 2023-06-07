import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ArrayValue } from "./format.values.array-value";
import { ArrayErrorResult } from "./format.errors.array-error-result";
import { isArrayValue } from "../../../utils";

export const { ArrayResult } = createCodecComponent(
  "ArrayResult",
  (data: Format.Values.ArrayResult) =>
    isArrayValue(data) ? (
      <ArrayValue data={data} />
    ) : (
      <ArrayErrorResult data={data} />
    )
);
