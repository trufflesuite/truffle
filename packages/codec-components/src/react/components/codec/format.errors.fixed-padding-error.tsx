import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { FixedPaddingError } = createCodecComponent(
  "FixedPaddingError",
  ({ kind, raw }: Format.Errors.FixedPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
