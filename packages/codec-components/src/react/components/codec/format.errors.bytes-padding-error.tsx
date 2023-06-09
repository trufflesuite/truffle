import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { BytesPaddingError } = createCodecComponent(
  "BytesPaddingError",
  ({ kind, raw }: Format.Errors.BytesPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
