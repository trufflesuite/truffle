import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { EnumPaddingError } = createCodecComponent(
  "EnumPaddingError",
  ({ kind, raw }: Format.Errors.EnumPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
