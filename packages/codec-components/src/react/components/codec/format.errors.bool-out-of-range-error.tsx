import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { BoolOutOfRangeError } = createCodecComponent(
  "BoolOutOfRangeError",
  ({ kind, rawAsBN }: Format.Errors.BoolOutOfRangeError) => (
    <CodecError kind={kind}>{rawAsBN.toString()}</CodecError>
  )
);
