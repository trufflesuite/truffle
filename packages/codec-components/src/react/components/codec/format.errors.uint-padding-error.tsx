import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { UintPaddingError } = createCodecComponent(
  "UintPaddingError",
  ({ kind, raw }: Format.Errors.UintPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
