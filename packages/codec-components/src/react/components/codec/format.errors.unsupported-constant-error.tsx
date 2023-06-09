import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { UnsupportedConstantError } = createCodecComponent(
  "UnsupportedConstantError",
  ({ kind, definition }: Format.Errors.UnsupportedConstantError) => (
    <CodecError kind={kind}>{definition.name}</CodecError>
  )
);
