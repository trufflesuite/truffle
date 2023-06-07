import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintValue } from "./format.values.uint-value";
import { UintErrorResult } from "./format.errors.uint-error-result";
import { isUintValue } from "../../../utils";

export const { UintResult } = createCodecComponent(
  "UintResult",
  (data: Format.Values.UintResult) =>
    isUintValue(data) ? (
      <UintValue data={data} />
    ) : (
      <UintErrorResult data={data} />
    )
);
