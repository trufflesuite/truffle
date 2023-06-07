import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BytesStaticResult } from "./format.values.bytes-static-result";
import { BytesDynamicResult } from "./format.values.bytes-dynamic-result";
import { isBytesStaticResult } from "../../../utils";

export const { BytesResult } = createCodecComponent(
  "BytesResult",
  (data: Format.Values.BytesResult) =>
    isBytesStaticResult(data) ? (
      <BytesStaticResult data={data} />
    ) : (
      <BytesDynamicResult data={data} />
    )
);
