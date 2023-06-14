import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { StructValue } from "./format.values.struct-value";
import { StructErrorResult } from "./format.errors.struct-error-result";
import { isStructValue } from "../../../utils";

export const { StructResult } = createCodecComponent(
  "StructResult",
  (data: Format.Values.StructResult) =>
    isStructValue(data) ? (
      <StructValue data={data} />
    ) : (
      <StructErrorResult data={data} />
    )
);
