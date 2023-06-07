import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BytesStaticErrorResult } from "./format.errors.bytes-static-error-result";
import { BytesDynamicErrorResult } from "./format.errors.bytes-dynamic-error-result";
import { isBytesStaticErrorResult } from "../../../utils";

export const { BytesErrorResult } = createCodecComponent(
  "BytesErrorResult",
  (data: Format.Errors.BytesErrorResult) =>
    isBytesStaticErrorResult(data) ? (
      <BytesStaticErrorResult data={data} />
    ) : (
      <BytesDynamicErrorResult data={data} />
    )
);
