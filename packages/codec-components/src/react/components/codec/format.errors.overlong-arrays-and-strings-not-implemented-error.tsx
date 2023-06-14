import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { OverlongArraysAndStringsNotImplementedError } =
  createCodecComponent(
    "OverlongArraysAndStringsNotImplementedError",
    ({
      kind,
      lengthAsBN
    }: Format.Errors.OverlongArraysAndStringsNotImplementedError) => (
      <CodecError kind={kind}>{lengthAsBN.toString()}</CodecError>
    )
  );
