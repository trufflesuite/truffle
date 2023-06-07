import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { StringValue } from "./format.values.string-value";
import { StringErrorResult } from "./format.errors.string-error-result";
import { isStringValue } from "../../../utils";

export const { StringResult } = createCodecComponent(
  "StringResult",
  (data: Format.Values.StringResult) =>
    isStringValue(data) ? (
      <StringValue data={data} />
    ) : (
      <StringErrorResult data={data} />
    )
);
