import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { BoolPaddingError } = createCodecComponent(
  "BoolPaddingError",
  ({ kind, raw }: Format.Errors.BoolPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
