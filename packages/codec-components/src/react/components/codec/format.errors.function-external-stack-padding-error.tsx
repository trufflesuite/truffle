import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { FunctionExternalStackPaddingError } = createCodecComponent(
  "FunctionExternalStackPaddingError",
  ({ kind, rawAddress }: Format.Errors.FunctionExternalStackPaddingError) => (
    <CodecError kind={kind}>{rawAddress}</CodecError>
  )
);
