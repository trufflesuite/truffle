import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UfixedValue } from "./format.values.ufixed-value";
import { UfixedErrorResult } from "./format.errors.ufixed-error-result";
import { isUfixedValue } from "../../../utils";

export const { UfixedResult } = createCodecComponent(
  "UfixedResult",
  (data: Format.Values.UfixedResult) =>
    isUfixedValue(data) ? (
      <UfixedValue data={data} />
    ) : (
      <UfixedErrorResult data={data} />
    )
);
