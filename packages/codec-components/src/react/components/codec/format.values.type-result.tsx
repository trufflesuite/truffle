import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { TypeValue } from "./format.values.type-value";
import { TypeErrorResult } from "./format.errors.type-error-result";
import { isTypeValue } from "../../../utils";

export const { TypeResult } = createCodecComponent(
  "TypeResult",
  (data: Format.Values.TypeResult) =>
    isTypeValue(data) ? (
      <TypeValue data={data} />
    ) : (
      <TypeErrorResult data={data} />
    )
);
