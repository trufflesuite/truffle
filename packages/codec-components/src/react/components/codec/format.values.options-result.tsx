import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { OptionsValue } from "./format.values.options-value";
import { OptionsErrorResult } from "./format.errors.options-error-result";
import { isOptionsValue } from "../../../utils";

export const { OptionsResult } = createCodecComponent(
  "OptionsResult",
  (data: Format.Values.OptionsResult) =>
    isOptionsValue(data) ? (
      <OptionsValue data={data} />
    ) : (
      <OptionsErrorResult data={data} />
    )
);
