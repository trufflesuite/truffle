import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { EnumValue } from "./format.values.enum-value";
import { EnumErrorResult } from "./format.errors.enum-error-result";
import { isEnumValue } from "../../../utils";

export const { EnumResult } = createCodecComponent(
  "EnumResult",
  (data: Format.Values.EnumResult) =>
    isEnumValue(data) ? (
      <EnumValue data={data} />
    ) : (
      <EnumErrorResult data={data} />
    )
);
