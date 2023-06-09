import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { OverlongArrayOrStringStrictModeError } = createCodecComponent(
  "OverlongArrayOrStringStrictModeError",
  ({
    kind,
    lengthAsBN
  }: Format.Errors.OverlongArrayOrStringStrictModeError) => (
    <CodecError kind={kind}>{lengthAsBN.toString()}</CodecError>
  )
);
