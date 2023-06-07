import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BytesDynamicValue } from "./format.values.bytes-dynamic-value";
import { BytesDynamicErrorResult } from "./format.errors.bytes-dynamic-error-result";
import { isBytesDynamicValue } from "../../../utils";

export const { BytesDynamicResult } = createCodecComponent(
  "BytesDynamicResult",
  (data: Format.Values.BytesDynamicResult) =>
    isBytesDynamicValue(data) ? (
      <BytesDynamicValue data={data} />
    ) : (
      <BytesDynamicErrorResult data={data} />
    )
);
