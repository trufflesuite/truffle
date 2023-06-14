import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { AddressPaddingError } = createCodecComponent(
  "AddressPaddingError",
  ({ kind, raw }: Format.Errors.AddressPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
