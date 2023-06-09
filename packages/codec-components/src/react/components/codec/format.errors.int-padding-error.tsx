import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { IntPaddingError } = createCodecComponent(
  "IntPaddingError",
  ({ kind, raw }: Format.Errors.IntPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
