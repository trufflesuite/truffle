import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { ReEncodingMismatchError } = createCodecComponent(
  "ReEncodingMismatchError",
  ({ kind }: Format.Errors.ReEncodingMismatchError) => (
    <CodecError kind={kind} />
  )
);
