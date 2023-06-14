import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { FunctionExternalNonStackPaddingError } = createCodecComponent(
  "FunctionExternalNonStackPaddingError",
  ({ kind, raw }: Format.Errors.FunctionExternalNonStackPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
