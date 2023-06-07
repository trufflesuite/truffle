import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FixedValue } from "./format.values.fixed-value";
import { FixedErrorResult } from "./format.errors.fixed-error-result";
import { isFixedValue } from "../../../utils";

export const { FixedResult } = createCodecComponent(
  "FixedResult",
  (data: Format.Values.FixedResult) =>
    isFixedValue(data) ? (
      <FixedValue data={data} />
    ) : (
      <FixedErrorResult data={data} />
    )
);
