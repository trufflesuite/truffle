import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { FunctionInternalPaddingError } = createCodecComponent(
  "FunctionInternalPaddingError",
  ({ kind, raw }: Format.Errors.FunctionInternalPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
