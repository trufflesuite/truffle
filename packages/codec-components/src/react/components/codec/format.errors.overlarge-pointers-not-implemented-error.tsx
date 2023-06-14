import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { OverlargePointersNotImplementedError } = createCodecComponent(
  "OverlargePointersNotImplementedError",
  ({
    kind,
    pointerAsBN
  }: Format.Errors.OverlargePointersNotImplementedError) => (
    <CodecError kind={kind}>{pointerAsBN.toString()}</CodecError>
  )
);
