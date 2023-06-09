import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { UfixedPaddingError } = createCodecComponent(
  "UfixedPaddingError",
  ({ kind, raw }: Format.Errors.UfixedPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
