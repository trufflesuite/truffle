import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BoolValue } from "./format.values.bool-value";
import { BoolErrorResult } from "./format.errors.bool-error-result";
import { isBoolValue } from "../../../utils";

export const { BoolResult } = createCodecComponent(
  "BoolResult",
  (data: Format.Values.BoolResult) =>
    isBoolValue(data) ? (
      <BoolValue data={data} />
    ) : (
      <BoolErrorResult data={data} />
    )
);
