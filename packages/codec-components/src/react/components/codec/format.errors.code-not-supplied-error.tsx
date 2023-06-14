import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { CodeNotSuppliedError } = createCodecComponent(
  "CodeNotSuppliedError",
  ({ kind, address }: Format.Errors.CodeNotSuppliedError) => (
    <Code title={`${kind}: ${address}`}>?</Code>
  )
);
