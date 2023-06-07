import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BuiltInValueErrorResult } from "./format.errors.built-in-value-error-result";

export const { WrappedError } = createCodecComponent(
  "WrappedError",
  ({ error }: Format.Errors.WrappedError) => (
    <BuiltInValueErrorResult data={error} />
  )
);
