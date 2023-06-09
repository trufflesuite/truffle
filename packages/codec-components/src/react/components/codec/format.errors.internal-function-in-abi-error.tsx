import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { InternalFunctionInABIError } = createCodecComponent(
  "InternalFunctionInABIError",
  ({ kind }: Format.Errors.InternalFunctionInABIError) => (
    <CodecError kind={kind} />
  )
);
