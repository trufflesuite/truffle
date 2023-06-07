import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BytesStaticValue } from "./format.values.bytes-static-value";
import { BytesStaticErrorResult } from "./format.errors.bytes-static-error-result";
import { isBytesStaticValue } from "../../../utils";

export const { BytesStaticResult } = createCodecComponent(
  "BytesStaticResult",
  (data: Format.Values.BytesStaticResult) =>
    isBytesStaticValue(data) ? (
      <BytesStaticValue data={data} />
    ) : (
      <BytesStaticErrorResult data={data} />
    )
);
